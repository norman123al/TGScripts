"""Validate TGScripts PRs without running PixInsight or extracting an update."""

import argparse
import hashlib
import posixpath
import re
import subprocess
import tarfile
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


REPOSITORY = Path(__file__).resolve().parents[1]
UPDATE = "TGScripts_repository"
SCRIPTS = "src/scripts/TGScripts"
HELP = "doc/scripts"
PIDOC = "TGScripts_docu/pidoc"
ARCHIVE = "TGScripts_repository.tar.gz"
MANIFEST = "updates.xri"

# Includes retired TGScripts help directories retained for updater cleanup.
OWNED_HELP = set("""
    AberrationInspectorTG AberrationSpotterTG AstroBucketList BBStarReduction
    ColorMaskTG CSTG DarkStructureEnhanceTG DeconvolutionPreviewTG
    EmissionLineIntegrationTG LinearMasterBlend LocalSupportMask
    LRGBDeconvolutionMatch ROILinearFit StarSpikeProtectionMask
    SubframeQualityReview TGCornerMosaic TGDustContrast TGFieldMosaic
    TGHueRangeMask TGPSFComparison TGScriptSkeleton
""".split())
PIXINSIGHT_HELP_ASSETS = {
    f"{UPDATE}/doc/pidoc/{path}" for path in (
        "css/pidoc-common.css", "css/pidoc-highlight.css", "css/pidoc-tool.css",
        "icons/pidoc-icon.svg", "scripts/pidoc-utility.js",
    )
}
INCLUDE = re.compile(r'^\s*#include\s+(?:"([^"\n]+)"|<([^>\n]+)>)', re.M)
FEATURE_DOC = re.compile(r'^\s*#feature-doc\s+("?)([^\n"]+?)\1\s*$', re.M)
HELP_LITERAL = re.compile(r'["\']/(?:doc/)?(scripts/[^"\'\n]+\.html)["\']')
HELP_ID = re.compile(r'\bDialog\.browseScriptDocumentation\(\s*["\']([\w-]+)["\']')
PIDOC_IMAGE = re.compile(r'\\image(?:\[[^\]\n]*\])?[ \t]*(?:\{([^}\n]+)\}|([^\s{}]+))')
TEXT_SUFFIXES = {".css", ".html", ".js", ".jsh", ".json", ".svg", ".txt", ".xsgn"}
WINDOWS_DEVICE = re.compile(r"(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])", re.I)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=REPOSITORY)


def tree(revision):
    entries = {}
    for record in git("ls-tree", "-r", "-z", revision).decode("utf-8").split("\0"):
        if record:
            metadata, path = record.split("\t", 1)
            mode, _, object_id = metadata.split()
            entries[path] = mode, object_id
    return entries


def is_file(entries, path):
    return path in entries and entries[path][0] in {"100644", "100755"}


def read_file(path):
    return (REPOSITORY / path).read_text(encoding="utf-8-sig")


class HelpLinks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag in {"a", "img", "link", "script"}:
            key = "src" if tag in {"img", "script"} else "href"
            self.links.extend(value for name, value in attrs if name == key and value)


def references(path, content):
    if path.startswith(f"{UPDATE}/{SCRIPTS}/") and path.endswith((".js", ".jsh")):
        for quoted, angle in INCLUDE.findall(content):
            if not angle.startswith(("pjsr/", "../src/scripts/")):
                yield posixpath.join(posixpath.dirname(path), quoted or angle)
        for _, target in FEATURE_DOC.findall(content):
            target = target.strip().lstrip("/")
            if not target.startswith("doc/"):
                target = "doc/" + target
            yield f"{UPDATE}/{target}"
        for target in HELP_LITERAL.findall(content):
            yield f"{UPDATE}/doc/{target}"
        for script in HELP_ID.findall(content):
            yield f"{UPDATE}/{HELP}/{script}/{script}.html"
    elif path.startswith(f"{UPDATE}/{HELP}/") and path.endswith(".html"):
        parser = HelpLinks()
        parser.feed(content)
        for link in parser.links:
            url = urlsplit(link)
            if url.path and not (url.scheme or url.netloc or url.path.startswith("/")):
                yield posixpath.join(posixpath.dirname(path), unquote(url.path))
    elif path.startswith(f"{PIDOC}/") and path.endswith(".pidoc"):
        for braced, bare in PIDOC_IMAGE.findall(content):
            yield posixpath.join(posixpath.dirname(path), braced or bare)


def check_layout(path, errors):
    relative = path.removeprefix(f"{UPDATE}/")
    forbidden = ("doc/pidoc", "doc/source", "images")
    if path.startswith(f"{UPDATE}/") and any(
        relative == prefix or relative.startswith(f"{prefix}/") for prefix in forbidden
    ):
        errors.append(f"{path}: this path is outside the update source layout")
    if path.endswith(".pidoc") and not path.startswith(f"{PIDOC}/"):
        errors.append(f"{path}: PiDoc source belongs under {PIDOC}/")
    if relative.startswith(f"{HELP}/") and not owned_update_path(relative):
        errors.append(f"{path}: documentation folder is missing from the TGScripts ownership list")


def check_references(entries, errors):
    for path in sorted(entries):
        relevant = (
            (path.startswith(f"{UPDATE}/{SCRIPTS}/") and path.endswith((".js", ".jsh")))
            or (path.startswith(f"{UPDATE}/{HELP}/") and path.endswith(".html"))
            or (path.startswith(f"{PIDOC}/") and path.endswith(".pidoc"))
        )
        if not relevant:
            continue
        if not is_file(entries, path):
            errors.append(f"{path}: expected a regular source or documentation file")
            continue
        for target in sorted({posixpath.normpath(link) for link in references(path, read_file(path))}):
            if target not in PIXINSIGHT_HELP_ASSETS and not is_file(entries, target):
                errors.append(f"{path}: missing reference to {target}")


def owned_update_path(path):
    if path.startswith(f"{SCRIPTS}/"):
        return True
    parts = path.split("/")
    return len(parts) > 3 and parts[:2] == ["doc", "scripts"] and parts[2] in OWNED_HELP


def archive_name(name):
    parts = name.split("/")
    if any(
        part in {"", ".", ".."} or part.endswith((".", " "))
        or re.search(r'[\x00-\x1f\x7f\\:<>"|?*]', part)
        or WINDOWS_DEVICE.fullmatch(part.split(".", 1)[0].rstrip(" "))
        for part in parts
    ):
        raise ValueError(f"unsafe archive path {name!r}")
    return name


def check_manifest(archive, errors):
    path = REPOSITORY / UPDATE / MANIFEST
    # PixInsight appends the signature as a sibling of the XRI document.
    text = path.read_text(encoding="utf-8-sig")
    text = re.sub(r"^\s*<\?xml\s[^?]*\?>", "", text, count=1)
    if re.search(r"<!\s*(?:DOCTYPE|ENTITY)\b", text, re.I):
        raise ValueError("unexpected XML declaration in the manifest")
    document = ET.fromstring(f"<signed-manifest>{text}</signed-manifest>")
    if [child.tag for child in document] != ["xri", "Signature"]:
        raise ValueError("expected an XRI document followed by its Signature element")
    signature = document[1]
    if signature.get("developerId") != "tglebe" or not (signature.text or "").strip():
        errors.append(f"{MANIFEST}: expected the tglebe signature record")
    packages = document[0].findall("platform/package")
    if not packages or any(package.get("fileName") != ARCHIVE for package in packages):
        raise ValueError(f"{MANIFEST}: expected package entries for {ARCHIVE}")
    with archive.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha1").hexdigest()
    owned_removals = {SCRIPTS} | {f"{HELP}/{name}" for name in OWNED_HELP}
    for package in packages:
        if (package.get("sha1") or "").lower() != checksum:
            errors.append(f"{MANIFEST}: SHA-1 for {ARCHIVE} must be {checksum}")
        for remove in package.findall(".//remove"):
            for path in (remove.text or "").splitlines():
                if path.strip() and path.strip() not in owned_removals:
                    errors.append(f"{MANIFEST}: unowned removal path {path.strip()!r}")


def check_archive(entries, archive, errors):
    expected = {}
    for path, (mode, object_id) in entries.items():
        if not path.startswith(f"{UPDATE}/"):
            continue
        relative = path.removeprefix(f"{UPDATE}/")
        if relative.startswith((f"{SCRIPTS}/", f"{HELP}/")):
            if not owned_update_path(relative) or mode not in {"100644", "100755"}:
                errors.append(f"{path}: expected a regular file in a TGScripts-owned directory")
            else:
                expected[relative] = object_id
    directories = {
        parent.as_posix() for path in expected for parent in PurePosixPath(path).parents
    } - {"."}
    seen = {}
    packaged = set()
    with tarfile.open(archive, mode="r|gz") as package:
        for member in package:
            path = archive_name(member.name)
            folded = path.casefold()
            if folded in seen:
                errors.append(f"{ARCHIVE}: duplicate or case-colliding member {path!r}")
                continue
            seen[folded] = path
            if member.isdir() and path in directories:
                continue
            if member.type not in {tarfile.REGTYPE, tarfile.AREGTYPE} or path not in expected:
                errors.append(f"{ARCHIVE}: unexpected path or entry type {path!r}")
                continue
            packaged.add(path)
            with package.extractfile(member) as stream:
                if archive_matches(stream, member, expected[path]):
                    continue
                errors.append(f"{ARCHIVE}: {path!r} differs from its source")
    for missing in sorted(expected.keys() - packaged):
        errors.append(f"{ARCHIVE}: missing {missing!r}")
    print(f"Compared {len(packaged)} archived files against {len(expected)} tracked release files.")


def archive_matches(stream, member, object_id):
    digest = hashlib.sha1(f"blob {member.size}\0".encode("ascii"))
    if PurePosixPath(member.name).suffix.lower() in TEXT_SUFFIXES:
        data = stream.read()
        digest.update(data)
        if digest.hexdigest() == object_id:
            return True
        source = git("cat-file", "blob", object_id)
        return data.replace(b"\r\n", b"\n") == source.replace(b"\r\n", b"\n")
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
        digest.update(chunk)
    return digest.hexdigest() == object_id


def main():
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument("--base", required=True, help="pull request base commit")
    arguments.add_argument("--check-package", action="store_true", help="also check an unchanged package")
    args = arguments.parse_args()
    if not re.fullmatch(r"[a-fA-F0-9]{40}", args.base):
        arguments.error("--base must be a full Git commit SHA")

    errors = []
    entries = tree("HEAD")
    for path in sorted(entries):
        check_layout(path, errors)
    check_references(entries, errors)
    changed = set(git("diff", "--name-only", "--no-renames", "-z", args.base, "HEAD").decode("utf-8").split("\0"))
    package_files = {f"{UPDATE}/{ARCHIVE}", f"{UPDATE}/{MANIFEST}"}
    if args.check_package or changed & package_files:
        missing = [path for path in sorted(package_files) if not is_file(entries, path)]
        if missing:
            errors.extend(f"{path}: expected a tracked regular file" for path in missing)
        else:
            archive = REPOSITORY / UPDATE / ARCHIVE
            check_manifest(archive, errors)
            check_archive(entries, archive, errors)
    else:
        print("Update package and manifest are unchanged.")

    for error in errors:
        print(f"ERROR: {error}")
    if not errors:
        print("TGScripts PR validation passed.")
    return bool(errors)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, ET.ParseError, tarfile.TarError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"ERROR: {error}") from error
