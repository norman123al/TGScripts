/*
 * PixInsight Reference Documentation System
 *
 * Utility JavaScript routines
 * Updated 2013 October 3
 *
 * Copyright (c) 2010-2013 Pleiades Astrophoto S.L. All Rights Reserved.
 */

/*
 * Returns an array with the x,y pixel position of an object on the current document.
 */
function pidoc_findPos( obj )
{
   var dx = 0;
   var dy = 0;
   while ( obj )
   {
      dx += obj.offsetLeft;
      dy += obj.offsetTop;
      obj = obj.offsetParent;
   }
   return new Array( dx, dy );
}

/*
 * Toggles the style.display CSS property of an object with id.
 */
function pidoc_toggleDisplay( id )
{
   var obj = document.getElementById( id );
   if ( obj )
      obj.style.display = obj.style.display ? "" : "none";
}

function pidoc_toggleSection( sectionId, button )
{
   var obj = document.getElementById( sectionId );
   if ( obj )
   {
      var wasVisible = obj.style.display.length == 0;
      obj.style.display = wasVisible ? "none" : "";
      button.innerHTML = wasVisible ? "[show]" : "[hide]";
   }
}

/*
 * Sets the 'src' attribute of an image selected by its id.
 */
function pidoc_setImgSrc( imgId, imgSrc )
{
   var obj = document.getElementById( imgId );
   if ( obj )
      obj.src = imgSrc;
}

/*
 * Hides a group of objects by setting to zero the style.opacity CSS property.
 */
function pidoc_hideGroup( elementBaseId, numberOfElements )
{
   for ( var i = 1; i <= numberOfElements; ++i )
   {
      var obj = document.getElementById( elementBaseId + "_" + i.toString() );
      if ( obj )
         obj.style.opacity = 0;
   }
}

/*
 * Sets the style.opacity CSS property of an object with id.
 */
function pidoc_setOpacity( id, opacity )
{
   var obj = document.getElementById( id );
   if ( obj )
      obj.style.opacity = opacity;
}

/*
 * onmousemove event listener - track pointer coordinates relative to window.
 * This means that we have to "position: fixed;" all dynamically moving items.
 */
var pidoc_mouseX = 0;
var pidoc_mouseY = 0;
function pidoc_listenMouseMove( event )
{
   event = event || window.event; // IE-ism
   pidoc_mouseX = event.clientX;
   pidoc_mouseY = event.clientY;
}

window.onmousemove = pidoc_listenMouseMove;

/*
 * Document elements that are generated and managed dynamically.
 */
function pidoc_generateDynamicContents()
{
   // Tooltip window
   document.writeln( "<div class=\"pidoc_referenceTooltipWindow\" id=\"referenceToolTip\"></div>" );
}

/*
 * Open the reference tooltip window for a given reference item at the current
 * pointer coordinates.
 */
function pidoc_showReferenceToolTip( refItem )
{
   var obj = document.getElementById( "referenceToolTip" );
   if ( obj )
   {
      obj.innerHTML = refItem.getAttribute( "data-tooltip" );
      obj.style.zIndex = 98;
      obj.style.opacity = 1;

      var s = window.getComputedStyle( obj );
      var w = parseInt( s.width ) + parseInt( s.paddingLeft ) + parseInt( s.paddingRight );
      var h = parseInt( s.height ) + parseInt( s.paddingTop ) + parseInt( s.paddingBottom );
      var d = 12;

      if ( pidoc_mouseX + w+d < window.innerWidth )
         obj.style.left = (pidoc_mouseX + d).toString() + "px";
      else
         obj.style.left = (pidoc_mouseX - w-d).toString() + "px";

      if ( pidoc_mouseY - h-d > 0 )
         obj.style.top = (pidoc_mouseY - h-d).toString() + "px";
      else
         obj.style.top = (pidoc_mouseY + d).toString() + "px";
   }
}

/*
 * Close the reference tooltip window.
 */
function pidoc_hideReferenceToolTip()
{
   var obj = document.getElementById( "referenceToolTip" );
   if ( obj )
   {
      obj.style.zIndex = -1;
      obj.style.opacity = 0;
   }
}

/*
 * Location and transient highlight of the current link target.
 *
 * The flash is defined by the pidoc_targetFlash animation in the
 * pidoc-common.css style sheet, which applies it through the :target
 * pseudo-class. The routines below refine that behavior in three ways:
 *
 * - The item that has to be highlighted is not always the item referenced by
 *   the link. Labels and figures are anchored with empty elements, which have
 *   no dimensions and are sometimes wrapped in paragraphs of their own, and
 *   links to sections should highlight their titles.
 *
 * - Browsers scroll to the referenced item, which for a label defined in the
 *   body of a section leaves its title above the top border of the page. The
 *   item that is highlighted is also the item that is scrolled to.
 *
 * - :target does not change when a link to the item that is already selected
 *   is followed again, so in such cases the animation would not be replayed.
 */

/*
 * Returns true iff an element can be highlighted as a whole. These are the
 * items that identify a specific point of a document, as opposed to the
 * blocks that structure it, such as sections and their contents.
 */
function pidoc_isHighlightableItem( element )
{
   if ( element.classList.contains( "pidoc_objectItem" )
     || element.classList.contains( "pidoc_figure" )
     || element.classList.contains( "pidoc_parameter" )
     || element.classList.contains( "pidoc_box" )
     || element.classList.contains( "pidoc_sectionTitle" )
     || element.classList.contains( "pidoc_subsectionTitle" ) )
      return true;
   switch ( element.tagName )
   {
   case "P": case "LI": case "TD": case "TABLE":
   case "H1": case "H2": case "H3": case "H4": case "H5": case "H6":
      return true;
   default:
      // Tables are generated wrapped in blocks of their own, which contain
      // the table and, when the table is labeled, its anchor.
      return element.children.length <= 2 && element.querySelector( ":scope > table" ) != null;
   }
}

/*
 * Returns the title of a section or subsection, or null if it has none.
 */
function pidoc_sectionTitle( section )
{
   return section.querySelector( ":scope > .pidoc_sectionTitle, :scope > .pidoc_subsectionTitle" );
}

/*
 * Returns the element that has to be located and highlighted for the item
 * with the specified id, which is not always the item itself.
 */
function pidoc_highlightableTarget( id )
{
   var obj = document.getElementById( id );
   if ( !obj )
      return null;

   /*
    * Items anchored with empty elements, such as figures, labels, process
    * parameters and tables, have no contents of their own, and the same
    * happens with the paragraphs generated to contain such anchors. The
    * document body is never reached, no matter how empty an item is.
    */
   while ( obj.parentElement && obj.parentElement.tagName != "BODY"
        && obj.textContent.trim().length == 0 )
      obj = obj.parentElement;

   /*
    * The [more] link of brief descriptions refers to the whole contents of
    * the document.
    */
   if ( obj.id == "__contents__" )
   {
      var first = obj.querySelector( ":scope > .pidoc_section" );
      if ( first )
         obj = first;
   }

   /*
    * Sections and subsections can span several screens, so their titles are
    * located and highlighted instead. The same applies to the blocks that
    * contain their bodies, which is where the labels defined in a section
    * body are resolved.
    */
   var title = null;
   if ( obj.classList.contains( "pidoc_section" ) || obj.classList.contains( "pidoc_subsection" ) )
      title = pidoc_sectionTitle( obj );
   else if ( !pidoc_isHighlightableItem( obj ) )
   {
      var section = obj.closest( ".pidoc_section, .pidoc_subsection" );
      if ( section )
         title = pidoc_sectionTitle( section );
   }

   return title ? title : obj;
}

/*
 * Replays the target flash animation on an element.
 *
 * The class ensures that the animation is also applied to the items that the
 * style sheet cannot select with the :target pseudo-class, and removing the
 * animation, forcing a reflow and restoring it is the standard way to restart
 * a CSS animation, which is necessary when the item is already selected.
 *
 * When the reduced motion preference is enabled, the style sheet defines no
 * animation and this routine has no visible effect.
 */
function pidoc_flashElement( element )
{
   if ( element )
   {
      element.classList.add( "pidoc_targetFlash" );
      element.style.animation = "none";
      void element.offsetWidth;
      element.style.animation = "";
      element.addEventListener( "animationend", function()
      {
         element.classList.remove( "pidoc_targetFlash" );
      }, { once: true } );
   }
}

/*
 * Scrolls an element to the top border of the page, leaving the margin
 * defined by the style sheet, and flashes it.
 */
function pidoc_locateElement( element )
{
   if ( element )
   {
      element.scrollIntoView();
      pidoc_flashElement( element );
   }
}

/*
 * Locates and flashes the item referenced by the current document location,
 * if any.
 */
function pidoc_locateCurrentTarget()
{
   var hash = window.location.hash;
   if ( hash.length > 1 )
   {
      var id = hash.substring( 1 );
      try
      {
         id = decodeURIComponent( id );
      }
      catch ( x )
      {
         // Malformed escape sequences: use the identifier verbatim.
      }
      pidoc_locateElement( pidoc_highlightableTarget( id ) );
   }
}

/*
 * Retained for compatibility with existing documents.
 */
function pidoc_flashCurrentTarget()
{
   pidoc_locateCurrentTarget();
}

/*
 * Internal links are located and flashed when they are activated, including
 * links to the item that is already selected, which do not change the
 * document location. This is deferred to the next event cycle, when the
 * browser has already updated the current target.
 */
document.addEventListener( "click", function( event )
{
   if ( event.target && event.target.closest )
   {
      var item = event.target.closest( "a[href^='#']" );
      if ( item && item.getAttribute( "href" ).length > 1 )
         setTimeout( pidoc_locateCurrentTarget, 0 );
   }
} );

/*
 * Links followed from other documents, as well as backward and forward
 * navigation, change the document location.
 */
window.addEventListener( "hashchange", pidoc_locateCurrentTarget );

/*
 * Documents loaded with a link target, for example when a page is reloaded,
 * are located when the whole contents are available, since the position of
 * the referenced item depends on the images already loaded.
 */
window.addEventListener( "load", function()
{
   setTimeout( pidoc_locateCurrentTarget, 0 );
} );

/*
 * Removes the fragment identifier from the current document location, so that
 * the document is really at its beginning: as long as a link target remains in
 * the URL, reloading the page, or coming back to it, jumps to the referenced
 * item again, and that item stays selected.
 *
 * The current history entry is replaced, so this generates neither a new
 * history entry nor a hashchange event, and the document is not reloaded.
 */
function pidoc_removeLocationHash()
{
   if ( window.location.hash.length > 0 )
      if ( window.history && window.history.replaceState )
         try
         {
            var url = window.location.href;
            var i = url.indexOf( "#" );
            window.history.replaceState( null, "", (i < 0) ? url : url.substring( 0, i ) );
         }
         catch ( x )
         {
            /*
             * Some browsers do not allow replacing the history state of a
             * local document. The fragment is then left as it is; the document
             * is scrolled to its beginning anyway.
             */
         }
}

/*
 * Navigation buttons.
 *
 * Two round buttons are generated dynamically, so that they are available on
 * all documents without regenerating them. They are placed on the left margin
 * of the page, which is always free of contents, and are only shown when the
 * document has been scrolled away from its beginning. The lower one goes back
 * to the beginning of the document; the upper one opens a floating panel with
 * the table of contents, which is only generated for documents that have a
 * contents section.
 */
function pidoc_generateNavigationButtons()
{
   if ( !document.body || document.querySelector( ".pidoc_toTop" ) )
      return;

   function reducedMotion()
   {
      return window.matchMedia && window.matchMedia( "(prefers-reduced-motion: reduce)" ).matches;
   }

   /*
    * Button to go to the beginning of the document.
    */
   var toTop = document.createElement( "button" );
   toTop.type = "button";
   toTop.className = "pidoc_toTop";
   toTop.title = "Go to the beginning of the document";
   toTop.setAttribute( "aria-label", toTop.title );

   toTop.addEventListener( "click", function()
   {
      pidoc_removeLocationHash();
      closeContentsPopup();
      window.scrollTo( { top: 0, behavior: reducedMotion() ? "auto" : "smooth" } );
   } );

   document.body.appendChild( toTop );

   /*
    * Button and floating panel with the table of contents.
    */
   var toc = document.getElementById( "toc" );
   var toContents = null;
   var popup = null;

   if ( toc )
   {
      toContents = document.createElement( "button" );
      toContents.type = "button";
      toContents.className = "pidoc_toContents";
      toContents.title = "Show the table of contents";
      toContents.setAttribute( "aria-label", toContents.title );
      toContents.setAttribute( "aria-expanded", "false" );
      toContents.setAttribute( "aria-haspopup", "true" );

      popup = document.createElement( "div" );
      popup.className = "pidoc_tocPopup";
      popup.setAttribute( "role", "dialog" );
      popup.setAttribute( "aria-label", "Table of contents" );

      document.body.appendChild( toContents );
      document.body.appendChild( popup );

      toContents.addEventListener( "click", function()
      {
         if ( popup.classList.contains( "pidoc_tocPopupVisible" ) )
            closeContentsPopup();
         else
            openContentsPopup();
      } );

      /*
       * Following one of the links closes the panel. The link itself is
       * followed as usual, since these are the same links of the document.
       */
      popup.addEventListener( "click", function( event )
      {
         if ( event.target && event.target.closest )
            if ( event.target.closest( "a[href]" ) )
               closeContentsPopup();
      } );

      /*
       * A click outside the panel closes it, as does the Escape key.
       */
      document.addEventListener( "click", function( event )
      {
         if ( !popup.contains( event.target ) && !toContents.contains( event.target ) )
            closeContentsPopup();
      } );

      document.addEventListener( "keydown", function( event )
      {
         if ( event.key == "Escape" || event.key == "Esc" )
            if ( popup.classList.contains( "pidoc_tocPopupVisible" ) )
            {
               closeContentsPopup();
               toContents.focus();
            }
      } );
   }

   /*
    * The contents of the panel are a copy of the contents section of the
    * document, so its links are exactly the links of the page and work in the
    * same way. The copy is rebuilt each time the panel is opened, to reflect
    * the current state of the document.
    */
   function fillContentsPopup()
   {
      while ( popup.firstChild )
         popup.removeChild( popup.firstChild );

      var inner = document.createElement( "div" );
      inner.className = "pidoc_tocPopupInner";

      var title = document.createElement( "p" );
      title.className = "pidoc_tocPopupTitle";
      title.textContent = "Contents";
      inner.appendChild( title );

      var contents = toc.cloneNode( true );
      contents.removeAttribute( "id" ); // the copy must not duplicate identifiers
      contents.className = "pidoc_tocPopupContents";
      contents.style.display = ""; // the contents section can be collapsed in the page
      inner.appendChild( contents );

      popup.appendChild( inner );
   }

   /*
    * Adjusts the width of the panel to the width of its entries, which are
    * never broken into several lines. The intrinsic width of a nested list
    * does not account for the indentation of its items, so the panel would be
    * too narrow if its width were left to the style sheet. The panel is grown
    * by whatever its contents overflow, until they fit or the maximum width
    * defined by the style sheet is reached; the entries that still do not fit
    * are reached by scrolling the panel horizontally.
    */
   function fitContentsPopup()
   {
      popup.style.width = "";
      for ( var i = 0; i < 4; ++i )
      {
         var excess = popup.scrollWidth - popup.clientWidth;
         if ( excess <= 0 )
            break;
         var width = parseFloat( window.getComputedStyle( popup ).width );
         if ( !(width > 0) )
            break;
         popup.style.width = Math.ceil( width + excess ) + "px";
      }
   }

   function openContentsPopup()
   {
      fillContentsPopup();
      popup.scrollTop = 0;
      popup.scrollLeft = 0;
      popup.classList.add( "pidoc_tocPopupVisible" );
      toContents.classList.add( "pidoc_toContentsOpen" );
      toContents.setAttribute( "aria-expanded", "true" );
      fitContentsPopup();
   }

   function closeContentsPopup()
   {
      if ( popup )
         if ( popup.classList.contains( "pidoc_tocPopupVisible" ) )
         {
            popup.classList.remove( "pidoc_tocPopupVisible" );
            toContents.classList.remove( "pidoc_toContentsOpen" );
            toContents.setAttribute( "aria-expanded", "false" );
         }
   }

   /*
    * The buttons are shown as soon as the document is scrolled away from its
    * beginning, which is exactly when they become useful.
    */
   function updateNavigationButtons()
   {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if ( y > 0 )
      {
         toTop.classList.add( "pidoc_toTopVisible" );
         if ( toContents )
            toContents.classList.add( "pidoc_toContentsVisible" );
      }
      else
      {
         toTop.classList.remove( "pidoc_toTopVisible" );
         if ( toContents )
            toContents.classList.remove( "pidoc_toContentsVisible" );
         closeContentsPopup();
      }
   }

   window.addEventListener( "scroll", updateNavigationButtons, { passive: true } );
   window.addEventListener( "resize", updateNavigationButtons );
   updateNavigationButtons();
}

/*
 * The buttons are generated as soon as the document tree is available, so that
 * they do not have to wait for images and other resources to be loaded.
 */
if ( document.readyState == "loading" )
   document.addEventListener( "DOMContentLoaded", pidoc_generateNavigationButtons );
else
   pidoc_generateNavigationButtons();
