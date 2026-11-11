/* Filesystem protection for TGScripts. Copyright (c) 2026 Thorsten Glebe.
 * SPDX-License-Identifier: MIT
 */
#ifndef __TGFileProtection_js
#define __TGFileProtection_js
var TGFileProtection = (function () {
   const windows = CoreApplication.platform === 'Windows';
   let protectedDirectories = null;
   let installationVolume = '';
   function parent(path) {
      path = path.replace(/\/+$/, '');
      let index = path.lastIndexOf('/');
      return index < 0 ? '' : index === 0 ? '/' :
         index === 2 && path[1] === ':' ? path.slice(0, 3) : path.slice(0, index);
   }
   function normalized(path) {
      let result = File.fullPath(path).replace(/\\/g, '/');
      return /^(?:[a-z]:)?\/$/i.test(result) ? result : result.replace(/\/+$/, '');
   }
   function under(path, root) {
      path = path.toLowerCase(); root = root.toLowerCase().replace(/\/+$/, '');
      return path === root || path.startsWith(root + '/');
   }
   function invalid(label, reason) {
      throw Error(label + ': ' + reason);
   }
   function inspect(value, label) {
      if (typeof value !== 'string' || !value.trim() || /[\x00-\x1f]/.test(value))
         invalid(label, 'Choose a valid file or folder.');
      let input = value.replace(/\\/g, '/');
      // Do not normalize away a link followed by ".." before inspecting it.
      if (input.split('/').includes('..'))
         invalid(label, 'Choose the full folder path without parent-directory components.');
      if (windows && (input.startsWith('//') || input.slice(2).includes(':') ||
          input.split('/').some(part => /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))))
         invalid(label, 'Choose a direct local path without network, device, or ambiguous names.');
      let path = normalized(input);
      if (windows && !/^[a-z]:[/]/i.test(path))
         invalid(label, 'Choose a direct local drive path.');
      for (let depth = 0; depth < 40; ++depth) {
         let ancestors = [], nearest = '', redirect = null;
         for (let current = path; current; ) {
            let info = new FileInfo(current);
            if (windows) {
               if (typeof info.isRedirectionPoint !== 'boolean')
                  invalid(label, 'This PixInsight version cannot verify redirected paths.');
               // Cloud placeholders also have isReparsePoint set. They do not
               // redirect and remain usable when isRedirectionPoint is false.
               if (info.isRedirectionPoint)
                  invalid(label, 'Choose the direct folder path instead of a symbolic link or junction.');
            } else if (info.isSymbolicLink) {
               if (!info.symbolicLinkTarget || info.symbolicLinkTarget.split('/').includes('..'))
                  invalid(label, 'The linked folder cannot be verified safely. Choose its direct path.');
               redirect = { path: current, target: info.symbolicLinkTarget };
               break;
            }
            if (info.exists) {
               let full = normalized(current);
               if (!nearest) nearest = full;
               if (info.isDirectory) ancestors.push(full);
            }
            let next = parent(current);
            if (next === current) break;
            current = next;
         }
         if (redirect) {
            let target = File.isAbsolutePath(redirect.target) ? redirect.target : parent(redirect.path) + '/' + redirect.target;
            path = normalized(target + path.slice(redirect.path.length));
            continue;
         }
         if (!nearest) invalid(label, 'The destination filesystem cannot be verified.');
         return { path, nearest, ancestors };
      }
      invalid(label, 'Too many linked folders. Choose a direct path.');
   }
   function unixInstallationDirectories(root) {
      if (protectedDirectories) return protectedDirectories;
      let paths = [], pending = [root];
      while (pending.length) {
         let directory = pending.pop();
         if (paths.some(path => File.sameFile(path, directory))) continue;
         paths.push(directory);
         let find = new FileFind;
         if (find.begin(directory + '/*')) do {
            if (find.isDirectory && !find.isSymbolicLink && find.name !== '.' && find.name !== '..')
               pending.push(directory + '/' + find.name);
         } while (find.next());
      }
      // The installed core tree is fixed while PixInsight is running: official
      // updates are installed after it exits. Directory identities also detect
      // existing POSIX bind mounts, for which there is no symbolic-link flag.
      protectedDirectories = paths;
      return paths;
   }
   function windowsVolume(path, label) {
      // Query only: /L prints a volume GUID and never creates/removes a mount.
      // A SUBST drive is not a physical volume mount and this query rejects it.
      // Never search PATH, invoke a command shell, or request elevation.
      const systemRoot = normalized(System.getEnvironmentVariable('SystemRoot'));
      if (!/^[a-z]:\/Windows$/i.test(systemRoot))
         invalid(label, 'The Windows system directory cannot be verified.');
      const executable = systemRoot + '/System32/mountvol.exe';
      inspect(executable, 'Windows volume utility');
      if (!File.exists(executable)) invalid(label, 'The Windows volume query utility is unavailable.');
      let process = new ExternalProcess;
      process.start(executable, [path.slice(0, 2) + '\\', '/L']);
      if (!process.waitForFinished(5000)) {
         process.terminate();
         if (!process.waitForFinished(500)) process.kill();
         invalid(label, 'The Windows volume query did not finish.');
      }
      const output = process.standardOutput.utf8ToString().trim();
      if (process.exitCode !== 0 || !/^\\\\\?\\Volume\{[0-9a-f-]{36}\}\\$/i.test(output))
         invalid(label, 'Choose a direct local drive instead of a substituted or network drive.');
      return output.toLowerCase();
   }
   function assertOutsideInstallation(value, label = 'File location') {
      let root = inspect(CoreApplication.baseDirPath, 'PixInsight installation'), target = inspect(value, label);
      if (under(target.path, root.path))
         invalid(label, 'Choose a location outside the PixInsight installation.');
      for (let ancestor of target.ancestors)
         if (File.sameFile(ancestor, root.path))
            invalid(label, 'This location refers to the PixInsight installation.');
      if (windows) {
         // File.fullPath expands short names, but sameFile and sameDevice do
         // not identify SUBST aliases on Windows. Use the OS volume query.
         if (!installationVolume) installationVolume = windowsVolume(root.path, label);
         if (target.path.slice(0, 2).toLowerCase() !== root.path.slice(0, 2).toLowerCase()) {
            if (windowsVolume(target.path, label) === installationVolume)
               invalid(label, 'Choose the installation volume by its direct drive letter.');
         }
      } else {
         for (let ancestor of target.ancestors)
            for (let directory of unixInstallationDirectories(root.path))
               if (File.sameFile(ancestor, directory))
                  invalid(label, 'This location refers to a folder in the PixInsight installation.');
      }
      return target.path;
   }
   function removeFile(path, label = 'File location') {
      assertOutsideInstallation(path, label);
      File.remove(path);
   }
   function removeDirectory(path, label = 'Directory location') {
      assertOutsideInstallation(path, label);
      File.removeDirectory(path);
   }
   function equal(a, b) { return a.length === b.length && a.toBase64() === b.toBase64(); }
   function writeFile(path, bytes, label = 'Output file') {
      path = assertOutsideInstallation(path, label);
      if (File.directoryExists(path)) invalid(label, 'Choose a file, not a folder.');
      const directory = parent(path);
      if (!File.directoryExists(directory)) invalid(label, 'The destination folder does not exist.');
      const staged = File.uniqueFileName(directory, 20, '.tgscripts-write-', '.tmp');
      let recovery = '', preserveRecovery = false;
      function create(file, data) {
         assertOutsideInstallation(file, label);
         if (File.exists(file) || File.directoryExists(file)) throw Error('Temporary path is occupied: ' + file);
         File.writeFile(file, data);
         if (!equal(File.readFile(file), data)) throw Error('Temporary file verification failed: ' + file);
      }
      try {
         create(staged, bytes);
         let previous = null;
         assertOutsideInstallation(path, label);
         if (File.exists(path)) {
            previous = File.readFile(path);
            recovery = File.uniqueFileName(directory, 20, '.tgscripts-recovery-', '.tmp');
            create(recovery, previous);
            assertOutsideInstallation(path, label);
            if (!equal(File.readFile(path), previous)) throw Error('The destination changed while preparing the save: ' + path);
            // Windows PJSR cannot report hard-link counts. Unlink this outside
            // directory entry instead of truncating the existing file, so a
            // hard link cannot change the bytes of an installation-owned file.
            removeFile(path, label);
         }
         try {
            assertOutsideInstallation(path, label);
            assertOutsideInstallation(staged, label);
            if (File.exists(path) || File.directoryExists(path)) throw Error('The destination is occupied: ' + path);
            File.moveFile(path, staged);
         } catch (error) {
            if (recovery) {
               preserveRecovery = true;
               try {
                  assertOutsideInstallation(path, label);
                  assertOutsideInstallation(recovery, label);
                  if (!File.exists(path) && !File.directoryExists(path)) {
                     File.moveFile(path, recovery); preserveRecovery = false;
                  }
               } catch (restoreError) { /* Retain the verified recovery file. */ }
            }
            throw Error(String(error) + (preserveRecovery ? '\nPrevious contents are preserved in: ' + recovery : ''));
         }
      } finally {
         for (let file of [staged, preserveRecovery ? '' : recovery])
            if (file) try { if (File.exists(file)) removeFile(file, label); }
            catch (error) { console.warningln('Temporary file remains at ' + file + ': ' + String(error)); }
      }
   }
   function writeTextFile(path, text, label) { writeFile(path, ByteArray.stringToUTF8(text), label); }
   return { assertOutsideInstallation, writeFile, writeTextFile, removeFile, removeDirectory };
})();
#endif
