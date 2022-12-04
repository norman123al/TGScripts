/*
   WCS metadata class

   This file is part of ImageSolver and AnnotateImage scripts

   Copyright (C) 2012-2020, Andres del Pozo
   Contributions (C) 2020, Juan Conejero (PTeam)
   All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this
      list of conditions and the following disclaimer.
   2. Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
   ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
   LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
   ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
   (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#define Ext_DataType_Complex     1000  // Complex object with settings
#define Ext_DataType_StringArray 1001  // Array of strings
#define Ext_DataType_JSON        1002  // Serializable object

#define WCS_MAX_STARS_IN_SOLUTION            25000
#define WCS_MAX_SPLINE_POINTS                2100
#define WCS_SIMPLIFIER_TARGET_SPLINE_POINTS  1800

#include "Projections.js"
#include <pjsr/PropertyType.jsh>
#include <pjsr/PropertyAttribute.jsh>
#include <pjsr/DataType.jsh>


/*
 * ObjectWithSettings: Base class for persistent classes.
 */
function ObjectWithSettings( module, prefix, properties )
{
   this.module = module;
   this.prefix = prefix ? prefix.replace( / /g, '' ) : null;
   this.properties = properties;

   this.MakeSettingsKey = function( property )
   {
      let key = "";
      if( this.module && this.module.length > 0 )
         key = this.module + "/";
      if( this.prefix && prefix.length > 0 )
         key = key + this.prefix + "/";
      return key + property;
   };

   this.LoadSettings = function()
   {
      for ( let i = 0; i < this.properties.length; ++i )
      {
         let property = this.properties[i][0];
         if ( property )
            if ( this.properties[i][1] == Ext_DataType_Complex )
            {
               if ( this[property] && typeof( this[property].LoadSettings ) === 'function' )
                  this[property].LoadSettings();
            }
            else if ( this.properties[i][1] == Ext_DataType_JSON )
            {
               let value = Settings.read( this.MakeSettingsKey( property ), DataType_UCString );
               if ( Settings.lastReadOK )
                  this[property] = JSON.parse( value );
            }
            else if ( this.properties[i][1] == Ext_DataType_StringArray )
            {
               let value = Settings.read( this.MakeSettingsKey( property ), DataType_UCString );
               if ( Settings.lastReadOK )
                  this[property] = value.split("|");
            }
            else
            {
               let value = Settings.read( this.MakeSettingsKey( property ), this.properties[i][1] );
               if ( Settings.lastReadOK )
                  this[property] = value;
            }
      }
   };

   this.SaveSettings = function()
   {
      for ( let i = 0; i < this.properties.length; ++i )
      {
         let property = this.properties[i][0];
         if ( this[property] != null )
         {
            if ( this.properties[i][1] == Ext_DataType_Complex )
               this[property].SaveSettings();
            else if ( this.properties[i][1] == Ext_DataType_JSON )
               Settings.write( this.MakeSettingsKey( property ), DataType_UCString, JSON.stringify( this[property] ) );
            else if ( this.properties[i][1] == Ext_DataType_StringArray )
            {
               let concatString = this.CreateStringArray( this[property] );
               if ( concatString != null )
                  Settings.write( this.MakeSettingsKey(property), DataType_UCString, concatString );
            }
            else
               Settings.write( this.MakeSettingsKey( property ), this.properties[i][1], this[property] );
         }
         else
            Settings.remove( this.MakeSettingsKey( property ) );
      }
   };

   this.DeleteSettings = function()
   {
      Settings.remove( this.prefix );
   };

   this.MakeParamsKey = function( property )
   {
      let key = "";
      if ( this.prefix && this.prefix.length > 0 )
         key = this.prefix.replace( "-", "" ) + "_";
      return key + property;
   };

   this.LoadParameters = function()
   {
      for ( let i = 0; i < this.properties.length; ++i )
      {
         let property = this.properties[i][0];
         if ( property )
            if ( this.properties[i][1] == Ext_DataType_Complex )
               this[property].LoadParameters();
            else
            {
               let key = this.MakeParamsKey( property );
               if ( Parameters.has( key ) )
               {
                  switch( this.properties[i][1] )
                  {
                  case DataType_Boolean:
                     this[property] = Parameters.getBoolean( key );
                     break;
                  case DataType_Int8:
                  case DataType_UInt8:
                  case DataType_Int16:
                  case DataType_UInt16:
                  case DataType_Int32:
                  case DataType_UInt32:
                  case DataType_Int64:
                  case DataType_UInt64:
                     this[property] = parseInt( Parameters.get( key ) );
                     break;
                  case DataType_Double:
                  case DataType_Float:
                     this[property] = Parameters.getReal( key );
                     break;
                  case DataType_String:
                  case DataType_UCString:
                     this[property] = Parameters.getString( key );
                     break;
                  case Ext_DataType_JSON:
                     // TODO: This is necessary because PI 1.8 doesn't allow " in strings
                     this[property] = JSON.parse( Parameters.getString( key ).replace( /\'\'/g, "\"" ) );
                     break;
                  case Ext_DataType_StringArray:
                     {
                        let value = Parameters.getString( key );
                        if ( value )
                           this[property] = value.split( "|" );
                     }
                     break;
                  default:
                     console.writeln( "Unknown property type '", this.properties[i][1] + "'" );
                  }
               }
            }
      }
   };

   this.SaveParameters = function()
   {
      for ( let i = 0; i < this.properties.length; ++i )
      {
         let property = this.properties[i][0];
         if ( this[property] != null )
         {
            if ( this.properties[i][1] == Ext_DataType_Complex )
               this[property].SaveParameters();
            else if ( this.properties[i][1] == Ext_DataType_JSON )
            {
               // TODO: This is necessary because PI 1.8 doesn't allow " in strings
               Parameters.set( this.MakeParamsKey( property ),
                               JSON.stringify( this[property] ).replace( /\"/g, "\'\'" ) );
            }
            else if( this.properties[i][1] == Ext_DataType_StringArray )
            {
               let array = this.CreateStringArray(this[property]);
               if ( array != null )
                  Parameters.set( this.MakeParamsKey( property ), array );
            }
            else
               Parameters.set( this.MakeParamsKey( property ), this[property] );
         }
      }
   };

   this.CreateStringArray = function( array )
   {
      let str = null;
      for ( let j = 0; j < array.length; ++j )
         if ( array[j] )
            str = (str == null) ? array[j] : str + "|" + array[j];
         else
            str = (str == null) ? "" : str + "|";
      return str;
   };
}

// ----------------------------------------------------------------------------

function WCSKeywords()
{
   this.radesys = null;
   this.objctra = null;
   this.objctdec = null;
   this.epoch = null;
   this.endTime = null;
   this.longobs = null;
   this.latobs = null;
   this.altobs = null;
   this.focallen = null;
   this.xpixsz = null;
   this.crval1 = null;
   this.crval2 = null;
   this.crpix1 = null;
   this.crpix2 = null;
   this.cd1_1 = null;
   this.cd1_2 = null;
   this.cd2_1 = null;
   this.cd2_2 = null;
   this.cdelt1 = null;
   this.cdelt2 = null;
   this.crota1 = null;
   this.crota2 = null;
   this.ctype1 = null;
   this.ctype2 = null;
   this.pv1_1 = null;
   this.pv1_2 = null;
   this.lonpole = null;
   this.latpole = null;
   this.polDegree = null;

   // Synthesized observation time from DATE-OBS and DATE-END/EXPTIME.
   this.observationTime = null;

   this.Read = function( keywords )
   {
      let expTime = null; // only if DATE-END is not available; see below.

      /*
       * Standard WCS FITS keywords
       */
      for ( let i = 0; i < keywords.length; ++i )
      {
         let name = keywords[i].name;
         let value = keywords[i].strippedValue;
#ifdef DEBUG
         console.writeln( name, ": '", value, "'" );
#endif
         if ( name == "CTYPE1" )
            this.ctype1 = "'" + value + "'";
         else if ( name == "CTYPE2" )
            this.ctype2 = "'" + value + "'";
         else if ( name == "CRVAL1" )
            this.crval1 = parseFloat( value );
         else if ( name == "CRVAL2" )
            this.crval2 = parseFloat( value );
         else if ( name == "CRPIX1" )
            this.crpix1 = parseFloat( value );
         else if ( name == "CRPIX2" )
            this.crpix2 = parseFloat( value );
         else if ( name == "CD1_1" )
            this.cd1_1 = parseFloat( value );
         else if ( name == "CD1_2" )
            this.cd1_2 = parseFloat( value );
         else if ( name == "CD2_1" )
            this.cd2_1 = parseFloat( value );
         else if ( name == "CD2_2" )
            this.cd2_2 = parseFloat( value );
         else if ( name == "CDELT1" )
            this.cdelt1 = parseFloat( value );
         else if ( name == "CDELT2" )
            this.cdelt2 = parseFloat( value );
         else if ( name == "CROTA1" )
            this.crota1 = parseFloat( value );
         else if ( name == "CROTA2" )
            this.crota2 = parseFloat( value );
         else if ( name == "PV1_1" )
            this.pv1_1 = parseFloat( value );
         else if ( name == "PV1_2" )
            this.pv1_2 = parseFloat( value );
         else if ( name == "PV1_3" || name == "LONPOLE" )
            this.lonpole = parseFloat( value );
         else if ( name == "PV1_4" || name == "LATPOLE" )
            this.latpole = parseFloat( value );
         else if ( name == "POLYNDEG" )
            this.polDegree = parseInt( value );
         else if ( name == "REFSPLIN" || name == "REFSPLINE" )
         {
            // N.B. Be compatible with 9-char keyword "REFSPLINE" written by
            // old versions of the ImageSolver script.
            this.refSpline = value != null && value.length > 0;
         }
      }

      /*
       * Primary optional FITS keywords.
       */
      for ( let i = 0; i < keywords.length; ++i )
      {
         let name = keywords[i].name;
         let value = keywords[i].strippedValue;

         if ( name == "RADESYS" )
         {
            /*
             * Reference system of celestial coordinates.
             */
            this.radesys = value;
         }
         else if ( name == "RA" )
         {
            /*
             * The RA keyword value can be either a complex angular
             * representation in hours (hh mm ss.sss) or a scalar in degrees
             * ([+|-]ddd.dddddd).
             */
            if ( value.indexOf( ' ' ) > 0 || value.indexOf( ':' ) > 0 )
            {
               let angle = DMSangle.FromString( value, 0, 24 );
               if ( angle != null )
                  this.objctra = 15*angle.GetValue();
            }
            else
               this.objctra = parseFloat( value );
         }
         else if ( name == "DEC" )
         {
            /*
             * The DEC keyword value can be either a complex angular
             * representation in degrees ([+|-]dd mm ss.sss) or a scalar
             * ([+|-]ddd.dddddd), also in degrees.
             */
            if ( value.indexOf( ' ' ) > 0 || value.indexOf( ':' ) > 0 )
            {
               let angle = DMSangle.FromString( value, 0, 90 );
               if ( angle != null )
                  this.objctdec = angle.GetValue();
            }
            else
               this.objctdec = parseFloat( value );
         }
         else if ( name == "DATE-BEG" )
         {
            let date = this.ExtractDate( value );
            if ( date )
               this.epoch = date;
         }
         else if ( name == "DATE-END" )
         {
            let date = this.ExtractDate( value );
            if ( date )
               this.endTime = date;
         }
         else if ( name == "OBSGEO-L" )
         {
            /*
             * The OBSGEO-L keyword value can be either a complex angular
             * representation in degrees ([+|-]ddd mm ss.sss) or a scalar in
             * degrees ([+|-]ddd.dddddd).
             */
            if ( value.indexOf( ' ' ) > 0 || value.indexOf( ':' ) > 0 )
            {
               let angle = DMSangle.FromString( value, 0, 180 ); // positive East
               if ( angle != null )
                  this.longobs = angle.GetValue();
            }
            else
               this.longobs = parseFloat( value );
         }
         else if ( name == "OBSGEO-B" )
         {
            /*
             * The OBSGEO-B keyword value can be either a complex angular
             * representation in degrees ([+|-]dd mm ss.sss) or a scalar in
             * degrees ([+|-]dd.dddddd).
             */
            if ( value.indexOf( ' ' ) > 0 || value.indexOf( ':' ) > 0 )
            {
               let angle = DMSangle.FromString( value, 0, 90 ); // positive North
               if ( angle != null )
                  this.latobs = angle.GetValue();
            }
            else
               this.latobs = parseFloat( value );
         }
         else if ( name == "OBSGEO-H" )
            this.altobs = parseFloat( value );
         else if ( name == "FOCALLEN" )
            this.focallen = parseFloat( value );
         else if ( name == "XPIXSZ" )
            this.xpixsz = parseFloat( value );
         else if ( name == "EXPTIME" )
            expTime = parseFloat( value );
      }

      /*
       * Secondary optional FITS keywords, supported for compatibility with
       * some applications.
       */
      for ( let i = 0; i < keywords.length; ++i )
      {
         let name = keywords[i].name;
         let value = keywords[i].strippedValue;

         if ( this.objctra == null && name == "OBJCTRA" )
         {
            /*
             * The OBJCTRA keyword value must be a complex angular
             * representation in hours (hh mm ss.sss)
             */
            let angle = DMSangle.FromString( value, 0, 24 );
            if ( angle != null )
               this.objctra = 15*angle.GetValue();
         }
         else if ( this.objctdec == null && name == "OBJCTDEC" )
         {
            /*
             * The OBJCTDEC keyword value must be a complex angular
             * representation in degrees ([+|-]dd mm ss.ss)
             */
            let angle = DMSangle.FromString( value, 0, 90 );
            if ( angle != null )
               this.objctdec = angle.GetValue();
         }
         else if ( this.epoch == null && name == "DATE-OBS" )
         {
            let date = this.ExtractDate( value );
            if ( date )
               this.epoch = date;
         }
         else if ( this.longobs == null && (name == "LONG-OBS" || name == "SITELONG") )
         {
            /*
             * The LONG-OBS or SITELONG keyword value must be a complex angular
             * representation in degrees ([+|-]ddd mm ss.sss).
             */
            let angle = DMSangle.FromString( value, 0, 180 ); // positive East
            this.longobs = (angle != null) ? angle.GetValue() : parseFloat( value );
         }
         else if ( this.latobs == null && (name == "LAT-OBS" || name == "SITELAT") )
         {
            /*
             * The LAT-OBS or SITELAT keyword value must be a complex angular
             * representation in degrees ([+|-]dd mm ss.sss).
             */
            let angle = DMSangle.FromString( value, 0, 90 ); // positive North
            this.latobs = (angle != null) ? angle.GetValue() : parseFloat( value );
         }
         else if ( this.altobs == null && (name == "ALT-OBS" || name == "SITEELEV") )
         {
            this.altobs = parseFloat( value );
         }
         else if ( this.xpixsz == null && name == "PIXSIZE" )
            this.xpixsz = parseFloat( value );
         else if ( expTime == null && name == "EXPOSURE" )
            expTime = parseFloat( value );
      }

      if ( this.epoch == null )
      {
         // Don't let funny FITS header data fool us.
         this.endTime = this.observationTime = null;
      }
      else
      {
         let endTime = null;

         /*
          * If DATE-END is not available, try to approximate it from the
          * observation start time and exposure time in seconds.
          */
         if ( this.endTime == null )
         {
            if ( expTime != null )
               endTime = this.epoch + expTime/86400;
         }
         else
         {
            // For mental sanity.
            if ( this.endTime < this.epoch )
            {
               let t = this.epoch;
               this.epoch = this.endTime;
               this.endTime = t;
            }
            endTime = this.endTime;
         }

         /*
          * Try to synthesize the observation middle time. This is the time
          * point we should use for all solar system ephemeris calculations.
          */
         if ( endTime != null )
            this.observationTime = this.epoch + (endTime - this.epoch)/2;
         else
            this.observationTime = this.epoch;
      }
   };

   this.ExtractDate = function( timeStr )
   {
      let match = timeStr.match("'?([0-9]*)-([0-9]*)-([0-9]*)(T([0-9]*):([0-9]*):([0-9]*(\.[0-9]*)?))?'?");
      if( match == null)
         return null;
      let year = parseInt( match[1], 10 );
      let month = parseInt( match[2], 10 );
      let day = parseInt( match[3], 10 );
      let hour = match[5] ? parseInt( match[5], 10 ) : 0;
      let min = match[6] ? parseInt( match[6], 10 ) : 0;
      let sec = match[7] ? parseFloat( match[7] ) : 0;
      let frac = (hour + min/60 + sec/3600)/24;

      return Math.calendarTimeToJD( year, month, day, frac );
   };

   this.CreateProjection = function()
   {
      let ptype1 = this.ctype1.substr( 6, 3 );
      let ptype2 = this.ctype2.substr( 6, 3 );
      if ( ptype1 != ptype2 )
         throw "Invalid/unsupported WCS coordinates: Axes with different projections";
      if ( ptype1 == "TAN" )
         return new Gnomonic( 180/Math.PI, this.crval1, this.crval2 );
      let proj = null;
      if ( ptype1 == "MER" )
         proj = new ProjectionMercator();
      else if ( ptype1 == "STG" )
         proj = new ProjectionStereographic();
      else if ( ptype1 == "CAR" )
         proj = new ProjectionPlateCarree();
      else if ( ptype1 == "ZEA" )
         proj = new ProjectionZenithalEqualArea();
      else if ( ptype1 == "AIT" )
         proj = new ProjectionHammerAitoff();
      else if ( ptype1 == "SIN" )
         proj = new ProjectionOrthographic();
      else
         throw "Invalid WCS coordinates: Unsupported projection '" + ptype1 + "'";
      proj.InitFromWCS( this );
      return proj;
   };
}

// ----------------------------------------------------------------------------

function DMath()
{
}

DMath.DEG2RAD = Math.PI / 180;
DMath.RAD2DEG = 180 / Math.PI;

DMath.sin = function( x )
{
   return Math.sin( x * this.DEG2RAD );
};

DMath.cos = function( x )
{
   return Math.cos( x * this.DEG2RAD );
};

DMath.tan = function( x )
{
   return Math.tan( x * this.DEG2RAD );
};

DMath.asin = function( x )
{
   return Math.asin( x ) * this.RAD2DEG;
};

DMath.acos = function( x )
{
   return Math.acos( x ) * this.RAD2DEG;
};

DMath.atan = function( x )
{
   return Math.atan( x ) * this.RAD2DEG;
};

DMath.atan2 = function( y, x )
{
   return Math.atan2( y, x ) * this.RAD2DEG;
};

// ----------------------------------------------------------------------------

/*
 * ImageMetadata: Metadata of an image including WCS coordinates.
 */
function ImageMetadata( module, scalingFactor )
{
   this.__base__ = ObjectWithSettings;
   this.__base__(
      module ? module : SETTINGS_MODULE,
      "metadata",
      new Array(
         ["focal", DataType_Double],
         ["useFocal", DataType_Boolean],
         ["xpixsz", DataType_Float],
         // ["ypixsz", DataType_Float],
         ["resolution", DataType_Double],
         ["referenceSystem", DataType_String],
         ["ra", DataType_Double],
         ["dec", DataType_Double],
         ["epoch", DataType_Double],
         ["observationTime", DataType_Double],
         ["topocentric", DataType_Boolean],
         ["obsLongitude", DataType_Double],
         ["obsLatitude", DataType_Double],
         ["obsHeight", DataType_Double]
      )
   );

   this.focal = 1000;
   this.useFocal = true;
   this.xpixsz = 7.4;
   // this.ypixsz = 7.4;
   this.resolution = null;
   this.referenceSystem = "ICRS";
   this.ra = null;
   this.dec = null;
   this.epoch = null; // ### TODO: Rename to startTime
   this.endTime = null;
   this.observationTime = null;
   this.topocentric = false;
   this.obsLongitude = null;
   this.obsLatitude = null;
   this.obsHeight = null;
   this.scalingFactor = scalingFactor ? scalingFactor : 1.0;
   this.sourceImageWindow = null;

   this.Clone = function()
   {
      let clone = new ImageMetadata();
      for ( let field in this )
         clone[field] = this[field];
      return clone;
   };

   this.ExtractMetadata = function( window )
   {
      let wcs = new WCSKeywords();
      wcs.Read( window.keywords );

      this.referenceSystem = wcs.radesys ? wcs.radesys : "ICRS";
      this.epoch = wcs.epoch;
      this.endTime = wcs.endTime;
      this.observationTime = wcs.observationTime;

      if ( wcs.longobs != null && wcs.latobs != null )
      {
         this.obsLongitude = wcs.longobs;
         this.obsLatitude = wcs.latobs;
         this.obsHeight = wcs.altobs;
         this.topocentric = true;
      }
      else
      {
         this.obsLongitude = this.obsLatitude = this.obsHeight = null;
         this.topocentric = false;
      }

      if ( wcs.xpixsz )
         this.xpixsz = wcs.xpixsz;

      this.sourceImageWindow = window;
      this.width = window.mainView.image.width;
      this.height = window.mainView.image.height;
      this.scaledWidth = Math.roundTo( this.width * this.scalingFactor, 2 );
      this.scaledHeight = Math.roundTo( this.height * this.scalingFactor, 2 );

      this.ref_I_G_linear = null;
      this.ref_I_G = null;
      this.ref_G_I = null;

      if ( wcs.ctype1 && wcs.ctype1.substr( 0, 5 ) == "'RA--" &&
           wcs.ctype2 && wcs.ctype2.substr( 0, 5 ) == "'DEC-" &&
           wcs.crpix1 != null && wcs.crpix2 != null && wcs.crval1 != null && wcs.crval2 != null )
      {
         try
         {
            this.projection = wcs.CreateProjection();

            let ref_F_G;
            if ( wcs.cd1_1 != null && wcs.cd1_2 != null && wcs.cd2_1 != null && wcs.cd2_2 != null )
            {
               ref_F_G = new Matrix(
                  wcs.cd1_1, wcs.cd1_2, -wcs.cd1_1 * wcs.crpix1 - wcs.cd1_2 * wcs.crpix2,
                  wcs.cd2_1, wcs.cd2_2, -wcs.cd2_1 * wcs.crpix1 - wcs.cd2_2 * wcs.crpix2,
                  0, 0, 1 );
            }
            else if ( wcs.cdelt1 != null && wcs.cdelt2 != null /*&& crota2 != null*/ )
            {
               if (wcs.crota2 == null)
                  wcs.crota2 = 0;
               let rot = Math.rad( wcs.crota2 );
               let cd1_1 = wcs.cdelt1 * Math.cos( rot );
               let cd1_2 = -wcs.cdelt2 * Math.sin( rot );
               let cd2_1 = wcs.cdelt1 * Math.sin( rot );
               let cd2_2 = wcs.cdelt2 * Math.cos( rot );
               ref_F_G = new Matrix(
                  cd1_1, cd1_2, -cd1_1*wcs.crpix1 - cd1_2*wcs.crpix2,
                  cd2_1, cd2_2, -cd2_1*wcs.crpix1 - cd2_2*wcs.crpix2,
                  0, 0, 1 );
            }

            if ( ref_F_G != null )
            {
               let ref_F_I = new Matrix(
                  1, 0, -0.5,
                  0, -1, this.height + 0.5,
                  0, 0, 1 );

               let controlPointsBArray = window.mainView.propertyValue( "Transformation_ImageToProjection" );
               if ( wcs.refSpline && (controlPointsBArray == null || !(controlPointsBArray instanceof ByteArray)) )
                  console.warningln( "<end><cbr>** Warning: The astrometric solution has lost distortion correction data." )
               if ( wcs.refSpline && controlPointsBArray && (controlPointsBArray instanceof ByteArray) )
               {
                  this.loadControlPoints( controlPointsBArray );
               }
               else if ( wcs.polDegree != null && wcs.polDegree > 1 )
               {
                  this.ref_I_G_linear = ref_F_G.mul( ref_F_I.inverse() );
                  this.ref_I_G = new ReferNPolyn( wcs.polDegree );
                  this.ref_G_I = new ReferNPolyn( wcs.polDegree );

                  try
                  {
                     let idx = 0;
                     let keywords = window.keywords;
                     for ( let o = 0; o <= this.ref_I_G.polDegree; ++o )
                     {
                        for ( let yi = 0; yi <= o; ++yi )
                        {
                           let xi = o - yi;
                           this.ref_I_G.at( 0, idx, this.GetKeywordFloat( keywords, format( "REFX_%d%d", xi, yi ), true ) );
                           this.ref_I_G.at( 1, idx, this.GetKeywordFloat( keywords, format( "REFY_%d%d", xi, yi ), true ) );
                           this.ref_G_I.at( 0, idx, this.GetKeywordFloat( keywords, format( "INVX_%d%d", xi, yi ), true ) );
                           this.ref_G_I.at( 1, idx, this.GetKeywordFloat( keywords, format( "INVY_%d%d", xi, yi ), true ) );
                           idx++;
                        }
                     }
                  }
                  catch ( ex )
                  {
                     console.writeln( "Invalid advanced referentiation: ", ex );
                     this.ref_I_G = this.ref_I_G_linear;
                     this.ref_G_I = this.ref_I_G.inverse();
                  }
               }
               else
               {
                  this.ref_I_G_linear = ref_F_G.mul( ref_F_I.inverse() );
                  this.ref_I_G = this.ref_I_G_linear;
                  this.ref_G_I = this.ref_I_G.inverse();
               }

               let centerG = this.ref_I_G.Apply( new Point( this.width/2, this.height/2 ) );
               let center = this.projection.Inverse( centerG );
               this.ra = center.x;
               this.dec = center.y;

               let resx = Math.sqrt( ref_F_G.at( 0, 0 )*ref_F_G.at( 0, 0 ) + ref_F_G.at( 0, 1 )*ref_F_G.at( 0, 1 ) );
               let resy = Math.sqrt( ref_F_G.at( 1, 0 )*ref_F_G.at( 1, 0 ) + ref_F_G.at( 1, 1 )*ref_F_G.at( 1, 1 ) );
               this.resolution = (resx + resy)/2;
               this.useFocal = false;
               if ( this.xpixsz > 0 )
                  this.focal = this.FocalFromResolution( this.resolution );
            }
         }
         catch ( ex )
         {
            console.writeln( ex );
         }
      }

      if ( this.ref_I_G == null )
      {
         if ( wcs.objctra != null )
            this.ra = wcs.objctra;
         if ( wcs.objctdec != null )
            this.dec = wcs.objctdec;
         if ( wcs.focallen > 0 )
         {
            this.focal = wcs.focallen;
            this.useFocal = true;
         }
         if ( this.useFocal && this.xpixsz > 0 )
            this.resolution = this.ResolutionFromFocal( this.focal );
      }
   };

   this.GetDateString = function( jd )
   {
      let dateArray = Math.jdToCalendarTime( jd );
      let hours = Math.trunc( dateArray[3]*24 );
      let min = Math.trunc( dateArray[3]*24*60 ) - hours*60;
      let sec = dateArray[3]*24*3600 - hours*3600 - min*60;
      return format( "%04d-%02d-%02dT%02d:%02d:%0.2f", dateArray[0], dateArray[1], dateArray[2], hours, min, sec );
   };

   this.ResolutionFromFocal = function( focal )
   {
      return (focal > 0) ? this.xpixsz/focal*0.18/Math.PI : 0;
   };

   this.FocalFromResolution = function( resolution )
   {
      return (resolution > 0) ? this.xpixsz/resolution*0.18/Math.PI : 0;
   };

   this.GetWCSvalues = function()
   {
      let ref_F_I = new Matrix(
         1, 0, -0.5,
         0, -1, this.height + 0.5,
         0, 0, 1 );
      let ref_F_G;
      if ( this.ref_I_G instanceof ReferSpline )
         ref_F_G = this.ref_I_G_linear.mul( ref_F_I );
      else if ( this.ref_I_G.polDegree && this.ref_I_G.polDegree != 1 )
         ref_F_G = this.ref_I_G_linear.mul( ref_F_I );
      else
      {
         if ( this.ref_I_G.ToLinearMatrix )
            ref_F_G = this.ref_I_G.ToLinearMatrix().mul( ref_F_I );
         else
            ref_F_G = this.ref_I_G.mul( ref_F_I );
      }

      //ref_F_G.Print();

      let wcs = this.projection.GetWCS();

      wcs.cd1_1 = ref_F_G.at( 0, 0 );
      wcs.cd1_2 = ref_F_G.at( 0, 1 );
      wcs.cd2_1 = ref_F_G.at( 1, 0 );
      wcs.cd2_2 = ref_F_G.at( 1, 1 );

      let orgF = ref_F_G.inverse().Apply( new Point( 0, 0 ) );
      wcs.crpix1 = orgF.x;
      wcs.crpix2 = orgF.y;

      // CDELT1, CDELT2 and CROTA2 are computed using the formulas
      // in section 6.2 of http://fits.gsfc.nasa.gov/fits_wcs.html
      // "Representations of celestial coordinates in FITS"
      let rot1, rot2;

      if ( wcs.cd2_1 > 0 )
         rot1 = Math.atan2( wcs.cd2_1, wcs.cd1_1 );
      else if ( wcs.cd2_1 < 0 )
         rot1 = Math.atan2( -wcs.cd2_1, -wcs.cd1_1 );
      else
         rot1 = 0;

      if ( wcs.cd1_2 > 0 )
         rot2 = Math.atan2( wcs.cd1_2, -wcs.cd2_2 );
      else if ( wcs.cd1_2 < 0 )
         rot2 = Math.atan2( -wcs.cd1_2, wcs.cd2_2 );
      else
         rot2 = 0;

      let rot = (rot1 + rot2)/2;
      rot2 = rot1 = rot;

      if ( Math.abs( Math.cos( rot ) ) > Math.abs( Math.sin( rot ) ) )
      {
         wcs.cdelt1 = wcs.cd1_1/Math.cos( rot );
         wcs.cdelt2 = wcs.cd2_2/Math.cos( rot );
      }
      else
      {
         wcs.cdelt1 = wcs.cd2_1/Math.sin( rot );
         wcs.cdelt2 = -wcs.cd1_2/Math.sin( rot );
      }

      wcs.crota1 = Math.deg( rot1 );
      wcs.crota2 = Math.deg( rot2 );

      return wcs;
   };

   this.GetRotation = function()
   {
      if ( this.ref_I_G_linear )
      {
         let ref = this.ref_I_G_linear ? this.ref_I_G_linear : this.ref_I_G;
         let det = ref.at( 0, 1 )*ref.at( 1, 0 ) - ref.at( 0, 0 )*ref.at( 1, 1 );
         let rot = Math.deg( Math.atan2( ref.at( 0, 0 ) + ref.at( 0, 1 ),
                                         ref.at( 1, 0 ) + ref.at( 1, 1 ) ) ) + 135;
         if ( det > 0 )
            rot = -90 - rot;
         if ( rot < -180 )
            rot += 360;
         if ( rot > 180 )
            rot -= 360;

         return [rot, det > 0];
      }

      return null;
   };

   this.SearchRadius = function()
   {
      let radius = Math.max( this.width, this.height )*this.resolution;

      if ( this.ref_I_G && radius < 100 )
      {
         let r1 = this.DistanceI( new Point( this.width/2, this.height/2 ),
                                  new Point( 0,            0             ), true/*unscaled*/ );
         let r2 = this.DistanceI( new Point( this.width/2, this.height/2 ),
                                  new Point( this.width,   0             ), true/*unscaled*/ );
         let r3 = this.DistanceI( new Point( this.width/2, this.height/2 ),
                                  new Point( 0,            this.height   ), true/*unscaled*/ );
         let r4 = this.DistanceI( new Point( this.width/2, this.height/2 ),
                                  new Point( this.width,   this.height   ), true/*unscaled*/ );
         if ( !r1 || !r2 || !r3 || !r4 )
            return 180;
         return Math.max( r1, r2, r3, r4 );
      }

      return radius;
   }

   /*
    * ### N.B. This method (along with its auxiliary functions) is no longer
    * used. To show descriptive information about astrometric solutions we now
    * use a new method available in PJSR since core version 1.8.6.1463:
    *
    * String ImageWindow.astrometricSolutionSummary()
    */
   this.Print = function()
   {
      let ref = this.ref_I_G_linear ? this.ref_I_G_linear : this.ref_I_G;
      console.writeln( "Referentiation matrix (world[ra,dec] = matrix * image[x,y]):" );
      ref.Print();
      let projOrgPx=this.ref_G_I.Apply( new Point( 0, 0 ) );
      let projOrgRD = new Point( Math.deg( this.projection.ra0 ), Math.deg( this.projection.dec0 ) );
      console.writeln( format(    "Projection origin .... [%.6f %.6f]px -> [RA:%ls Dec:%ls]",
         projOrgPx.x, projOrgPx.y,
         DMSangle.FromAngle( projOrgRD.x/15 ).ToString( true ), DMSangle.FromAngle( projOrgRD.y ).ToString() ) );
      if ( this.ref_I_G.polDegree && this.ref_I_G.polDegree > 1 )
         console.writeln(  format("Polynomial degree .... %d", this.ref_I_G.polDegree) );
      if ( this.controlPoints && (this.ref_I_G instanceof ReferSpline) )
      {
         console.writeln(  format("Spline order ......... %d", this.ref_I_G.order ) );
         console.writeln(  format("Num. ControlPoints ... %d", this.controlPoints.pI.length ) );
      }
      console.writeln( format(    "Resolution ........... %.3f as/px", this.resolution*3600 ) );
      let rotation = this.GetRotation();
      console.writeln( format(    "Rotation ............. %.3f deg", rotation[0] ), rotation[1] ? " (flipped)" : "" );

      if ( this.xpixsz > 0 && this.focal)
      {
         console.writeln( format( "Focal ................ %.2f mm", this.focal ) );
         console.writeln( format( "Pixel size ........... %.2f um", this.xpixsz ) );
      }

      console.writeln(            "Field of view ........ ", this.FieldString( this.width*this.resolution ), " x ", this.FieldString( this.height*this.resolution ) );

      console.write(              "Image center ......... ");  this.PrintCoords( new Point( this.width/2, this.height/2 ), true/*unscaled*/ );
      console.writeln(            "Image bounds:" );
      console.write(              "   top-left .......... " ); this.PrintCoords( new Point( 0,          0           ), true );
      console.write(              "   top-right ......... " ); this.PrintCoords( new Point( this.width, 0           ), true );
      console.write(              "   bottom-left ....... " ); this.PrintCoords( new Point( 0,          this.height ), true );
      console.write(              "   bottom-right ...... " ); this.PrintCoords( new Point( this.width, this.height ), true );
   };

   this.PrintCoords = function( pI, unscaled )
   {
      let pRD = this.Convert_I_RD( pI, unscaled );
      if ( pRD )
      {
         let ra_val = pRD.x;
         if ( ra_val < 0 )
            ra_val += 360;
         let ra = DMSangle.FromAngle( ra_val/15 );
         let dec = DMSangle.FromAngle( pRD.y );
         console.writeln( "RA: ", ra.ToString( true/*hours*/ ), "  Dec: ", dec.ToString() );
      }
      else
         console.writeln( '-'.repeat( 6 ) );
   };

   this.FieldString = function( field )
   {
      let dms = DMSangle.FromAngle( field );
      if ( dms.deg > 0 )
         return format( "%dd %d' %.1f\"", dms.deg, dms.min, dms.sec );
      if ( dms.min > 0 )
         return format( "%d' %.1f\"", dms.min, dms.sec );
      return format( "%.2f\"", dms.sec );
   };

   this.ModifyKeyword = function( keywords, name, value, comment )
   {
      for ( let i = 0; i < keywords.length; ++i )
         if ( keywords[i].name == name )
         {
            keywords[i].value = value;
            if ( comment != null )
               keywords[i].comment = comment;
            return;
         }
      keywords.push( new FITSKeyword( name, value, (comment == null) ? "" : comment ) );
   };

   this.RemoveKeyword = function( keywords, name )
   {
      for ( let i = 0; i < keywords.length; ++i )
         if ( keywords[i].name == name )
         {
            keywords.splice( i, 1 );
            return;
         }
   };

   this.GetKeywordFloat = function( keywords, name, exception )
   {
      for ( let i = 0; i < keywords.length; ++i )
         if ( keywords[i].name == name )
            return parseFloat( keywords[i].value );
      if ( exception )
         throw format( "Keyword %ls not found", name );
      return null;
   };

   this.UpdateBasicKeywords = function( keywords )
   {
      if ( this.focal > 0 )
         this.ModifyKeyword( keywords, "FOCALLEN", format( "%.3f", this.focal ), "Focal Length (mm)" );
      else
         this.RemoveKeyword( keywords, "FOCALLEN" );

      if ( this.xpixsz > 0 )
      {
         this.ModifyKeyword( keywords, "XPIXSZ", format( "%.3f", this.xpixsz ), "Pixel size, X-axis (um)" );
         this.ModifyKeyword( keywords, "YPIXSZ", format( "%.3f", this.xpixsz ), "Pixel size, Y-axis (um)" );
         this.RemoveKeyword( keywords, "PIXSIZE" );
      }

      if ( this.ra != null )
      {
         this.ModifyKeyword( keywords, "RA", format( "%.16f", this.ra ), "Right ascension of the center of the image (deg)" );
         this.RemoveKeyword( keywords, "OBJCTRA" );
      }

      if ( this.dec != null )
      {
         this.ModifyKeyword( keywords, "DEC", format( "%.16f", this.dec ), "Declination of the center of the image (deg)" );
         this.RemoveKeyword( keywords, "OBJCTDEC" );
      }

      if ( this.epoch != null )
      {
         this.ModifyKeyword( keywords, "DATE-OBS", this.GetDateString( this.epoch ), "Observation start time (UTC)" );
         this.RemoveKeyword( keywords, "DATE-BEG" );
      }

      if ( this.endTime != null )
         this.ModifyKeyword( keywords, "DATE-END", this.GetDateString( this.endTime ), "Observation end time (UTC)" );

      if ( this.obsLongitude != null )
      {
         this.ModifyKeyword( keywords, "OBSGEO-L", format( "%.7f", this.obsLongitude ), "Geodetic longitude (deg)" );
         this.RemoveKeyword( keywords, "LONG-OBS" );
         this.RemoveKeyword( keywords, "SITELONG" );
      }

      if ( this.obsLatitude != null )
      {
         this.ModifyKeyword( keywords, "OBSGEO-B", format( "%.7f", this.obsLatitude ), "Geodetic latitude (deg)" );
         this.RemoveKeyword( keywords, "LAT-OBS" );
         this.RemoveKeyword( keywords, "SITELAT" );
      }

      if ( this.obsHeight != null )
      {
         this.ModifyKeyword( keywords, "OBSGEO-H", format( "%.0f", this.obsHeight ), "Geodetic elevation (m)" );
         this.RemoveKeyword( keywords, "ALT-OBS" );
         this.RemoveKeyword( keywords, "SITEELEV" );
      }
   };

   this.UpdateWCSKeywords = function( keywords )
   {
      let wcs = this.GetWCSvalues();

      this.RemoveKeyword( keywords, "EQUINOX" );  // See Calabretta and Greisen, Section 3.1
      this.RemoveKeyword( keywords, "EPOCH" );    // See FITS standard 4.0, Section 8.3

      this.ModifyKeyword( keywords, "RADESYS",    "'" + this.referenceSystem + "'", "Reference system of celestial coordinates" );

      this.ModifyKeyword( keywords, "CTYPE1",     wcs.ctype1,                       "Axis1 projection: "+ this.projection.name );
      this.ModifyKeyword( keywords, "CTYPE2",     wcs.ctype2,                       "Axis2 projection: "+ this.projection.name );

      this.ModifyKeyword( keywords, "CRPIX1",     format( "%.8f", wcs.crpix1 ),     "Axis1 reference pixel" );
      this.ModifyKeyword( keywords, "CRPIX2",     format( "%.8f", wcs.crpix2 ),     "Axis2 reference pixel" );

      if ( wcs.crval1 != null )
         this.ModifyKeyword( keywords, "CRVAL1",  format( "%.16f", wcs.crval1 ),    "Axis1 reference value" );
      if ( wcs.crval2 != null )
         this.ModifyKeyword( keywords, "CRVAL2",  format( "%.16f", wcs.crval2 ),    "Axis2 reference value" );

      if ( wcs.pv1_1 != null )
         this.ModifyKeyword( keywords, "PV1_1",   format( "%.16f", wcs.pv1_1 ),     "Native longitude of the reference point" );
      if ( wcs.pv1_2 != null )
         this.ModifyKeyword( keywords, "PV1_2",   format( "%.16f", wcs.pv1_2 ),     "Native latitude of the reference point" );

      if ( wcs.lonpole != null )
         this.ModifyKeyword( keywords, "LONPOLE", format( "%.16f", wcs.lonpole ),   "Longitude of the celestial pole" );
      if ( wcs.latpole != null )
         this.ModifyKeyword( keywords, "LATPOLE", format( "%.16f", wcs.latpole ),   "Latitude of the celestial pole" );

      this.RemoveKeyword( keywords, "PC1_1" );
      this.RemoveKeyword( keywords, "PC1_2" );
      this.RemoveKeyword( keywords, "PC2_1" );
      this.RemoveKeyword( keywords, "PC2_2" );

      this.ModifyKeyword( keywords, "CD1_1",      format( "%.16f", wcs.cd1_1 ),     "Scale matrix (1,1)" );
      this.ModifyKeyword( keywords, "CD1_2",      format( "%.16f", wcs.cd1_2 ),     "Scale matrix (1,2)" );
      this.ModifyKeyword( keywords, "CD2_1",      format( "%.16f", wcs.cd2_1 ),     "Scale matrix (2,1)" );
      this.ModifyKeyword( keywords, "CD2_2",      format( "%.16f", wcs.cd2_2 ),     "Scale matrix (2,2)" );

      // AIPS keywords (CDELT1, CDELT2, CROTA1, CROTA2)
      this.ModifyKeyword( keywords, "CDELT1",     format( "%.16f", wcs.cdelt1 ),    "Axis1 scale" );
      this.ModifyKeyword( keywords, "CDELT2",     format( "%.16f", wcs.cdelt2 ),    "Axis2 scale" );
      this.ModifyKeyword( keywords, "CROTA1",     format( "%.16f", wcs.crota1 ),    "Axis1 rotation angle (deg)" );
      this.ModifyKeyword( keywords, "CROTA2",     format( "%.16f", wcs.crota2 ),    "Axis2 rotation angle (deg)" );
   };

   this.UpdateReferKeywords = function( keywords )
   {
      if ( this.controlPoints && (this.ref_I_G instanceof ReferSpline) )
      {
         this.ModifyKeyword( keywords, "REFSPLIN", "T", "Coordinates stored in properties as splines" );
         this.RemoveKeyword( keywords, "POLYNDEG" );
         return;
      }

      this.RemoveKeyword( keywords, "REFSPLIN" );

      if ( !this.ref_I_G.polDegree || this.ref_I_G.polDegree == 1 )
      {
         this.RemoveKeyword( keywords, "POLYNDEG" );
         return;
      }

      this.ModifyKeyword( keywords, "POLYNDEG", this.ref_I_G.polDegree.toString(), "Polynomial degree" );
      for ( let o = 0, idx = 0; o <= this.ref_I_G.polDegree; ++o )
         for ( let yi = 0; yi <= o; ++yi, ++idx )
         {
            let xi = o - yi;
            this.ModifyKeyword( keywords,
                                format( "REFX_%d%d", xi, yi ),
                                format( "%.16f", this.ref_I_G.at( 0, idx ) ),
                                format( "CoefX * x^%d * y^%d", xi, yi ) );
            this.ModifyKeyword( keywords,
                                format( "REFY_%d%d", xi, yi ),
                                format( "%.16f", this.ref_I_G.at( 1, idx ) ),
                                format( "CoefY * x^%d * y^%d", xi, yi ) );
            this.ModifyKeyword( keywords,
                                format( "INVX_%d%d", xi, yi ),
                                format( "%.16f", this.ref_G_I.at( 0, idx ) ),
                                format( "InvCoefX * x^%d * y^%d", xi, yi ) );
            this.ModifyKeyword( keywords,
                                format( "INVY_%d%d", xi, yi ),
                                format( "%.16f", this.ref_G_I.at( 1, idx ) ),
                                format( "InvCoefY * x^%d * y^%d", xi, yi ) );
         }
   };

   this.SaveKeywords = function( imageWindow, beginProcess )
   {
      console.writeln( "<end><cbr>Saving keywords..." );
      if ( beginProcess )
         imageWindow.mainView.beginProcess( UndoFlag_Keywords );

      let keywords = imageWindow.keywords;
      this.UpdateBasicKeywords( keywords );
      this.UpdateWCSKeywords( keywords );
      this.UpdateReferKeywords( keywords );
      imageWindow.keywords = keywords;

      if ( beginProcess )
         imageWindow.mainView.endProcess();
   };

   this.SaveProperties = function( imageWindow )
   {
      console.writeln( "<end><cbr>Saving properties..." );

      /*
       * Remove any existing XISF properties that might conflict with newly
       * calculated metadata, which we have defined through FITS keywords. All
       * astrometry-related keywords and properties will be regenerated by the
       * core with correct values in a subsequent call to
       * ImageWindow.regenerateAstrometricSolution().
       */
      imageWindow.mainView.deleteProperty( "Instrument:Telescope:FocalLength" );
      imageWindow.mainView.deleteProperty( "Instrument:Sensor:XPixelSize" );
      imageWindow.mainView.deleteProperty( "Instrument:Sensor:YPixelSize" );
      imageWindow.mainView.deleteProperty( "Observation:Time:Start" );
      imageWindow.mainView.deleteProperty( "Observation:Time:End" );
      imageWindow.mainView.deleteProperty( "Observation:Location:Longitude" );
      imageWindow.mainView.deleteProperty( "Observation:Location:Latitude" );
      imageWindow.mainView.deleteProperty( "Observation:Location:Elevation" );
      imageWindow.mainView.deleteProperty( "Observation:Center:RA" );
      imageWindow.mainView.deleteProperty( "Observation:Center:Dec" );
      imageWindow.mainView.deleteProperty( "Observation:CelestialReferenceSystem" );
      imageWindow.mainView.deleteProperty( "Observation:Equinox" );

      if ( this.controlPoints && (this.ref_I_G instanceof ReferSpline) )
         this.saveControlPoints( imageWindow );
      else
         imageWindow.mainView.deleteProperty( "Transformation_ImageToProjection" );

      imageWindow.mainView.setPropertyValue( "PCL:AstrometricSolution:Information",
                                             "source=computed,process=ImageSolver",
                                             PropertyType_String,
                                             PropertyAttribute_Storable | PropertyAttribute_Permanent );
   };

   this.saveControlPoints = function( imageWindow )
   {
      console.writeln( "<end><cbr>Saving control points..." );
      let lines = ["VERSION:1.1", "TYPE:SurfaceSpline"];
      lines.push( format( "ORDER:%d", this.ref_I_G.order ) );
      lines.push( format( "SMOOTHING:%.4f", this.ref_I_G.smoothing ) );
      lines.push( format( "SIMPLIFIER:%d", this.ref_I_G.simplify ? 1 : 0 ) );
      lines.push( format( "TOLERANCE:%.2f", this.ref_I_G.tolerance ) );
      lines.push( format( "REJECTFRACTION:%.2f", this.ref_I_G.rejectFraction ) );
      lines.push( "CONTROLPOINTS:[" );
      for ( let i = 0; i < this.controlPoints.pI.length; ++i )
         if ( this.controlPoints.pI[i] && this.controlPoints.pG[i] )
         {
            if ( this.controlPoints.weights )
               lines.push( format( "%.16f;%.16f;%.16f;%.16f;%.16f",
                                   this.controlPoints.pI[i].x, this.controlPoints.pI[i].y,
                                   this.controlPoints.pG[i].x, this.controlPoints.pG[i].y,
                                   this.controlPoints.weights[i] ) );
            else
               lines.push( format( "%.16f;%.16f;%.16f;%.16f",
                                   this.controlPoints.pI[i].x, this.controlPoints.pI[i].y,
                                   this.controlPoints.pG[i].x, this.controlPoints.pG[i].y ) );
         }
      lines.push( "]" );

      let byteArray = new ByteArray( lines.join( '\n' ) );
      //console.writeln( byteArray.toString() );
      imageWindow.mainView.setPropertyValue( "Transformation_ImageToProjection",
                                             byteArray,
                                             PropertyType_ByteArray,
                                             PropertyAttribute_Storable | PropertyAttribute_Permanent );
      console.writeln( format( "Saved %d control points.", this.controlPoints.pI.length ) );
   };

   this.loadControlPoints = function( byteArray )
   {
      console.writeln( "<end><cbr>Loading control points..." );
      let lines = byteArray.toString().split( "\n" );
      if ( lines.length == 0 )
         throw "Invalid coordinate transformation data.";
      let tokens = lines[0].split( ':' );
      if ( tokens.length != 2 || tokens[0] != "VERSION" )
         throw "Invalid coordinate transformation version data.";
      let version = tokens[1].trim();
      if ( version != "1" && version != "1.1" )
         throw "Unsupported coordinate transformation version '" + version + "'";

      let controlPoints = null, order = 2, smoothing = 0.025,
          simplify = true, tolerance = 0.25, rejectFraction = 0.10;

      for ( let i = 1; i < lines.length; ++i )
      {
         tokens = lines[i].split( ':' );
         if ( tokens.length != 2 )
            continue;
         switch ( tokens[0] )
         {
         case "ORDER":
            order = parseInt( tokens[1] );
            break;

         case "SMOOTHING":
            smoothing = parseFloat( tokens[1] );
            break;

         case "SIMPLIFIER":
            simplify = parseInt( tokens[1] ) != 0;
            break;

         case "TOLERANCE":
            tolerance = parseFloat( tokens[1] );
            break;

         case "REJECTFRACTION":
            rejectFraction = parseFloat( tokens[1] );
            break;

         case "CONTROLPOINTS":
            if ( tokens[1].trim() != '[' )
               throw "Invalid coordinate transformation control points.";
            i++;
            controlPoints = { pI:      [],
                              pG:      [],
                              weights: null };
            for ( ; i < lines.length && lines[i] != ']'; ++i )
            {
               let coords = lines[i].split( ';' );
               if ( coords.length < 4 )
                  throw "Invalid coordinate transformation control points.";
               if ( coords.length < 5 && controlPoints.weights != null )
                  throw "Invalid coordinate transformation control points.";
               if ( coords.length > 5 )
                  throw "Invalid coordinate transformation control points.";
               controlPoints.pI.push( new Point( parseFloat( coords[0] ), parseFloat( coords[1] ) ) );
               controlPoints.pG.push( new Point( parseFloat( coords[2] ), parseFloat( coords[3] ) ) );
               if ( coords.length == 5 )
               {
                  if ( controlPoints.weights == null )
                     controlPoints.weights = [];
                  controlPoints.weights.push( parseFloat( coords[4] ) );
               }
            }
            if ( controlPoints.weights && controlPoints.pI.length != controlPoints.weights.length )
               throw "Invalid coordinate transformation control points: Mismatched weights.";
            break;
         }
      }

      if ( controlPoints == null )
         throw "Invalid coordinate transformation: no control points were loaded.";
      this.controlPoints = controlPoints;
      this.ref_I_G = new ReferSpline( controlPoints.pI, controlPoints.pG, controlPoints.weights,
                                      order, smoothing,
                                      simplify, tolerance, rejectFraction );
      this.ref_I_G_linear = MultipleLinearRegression( 1, controlPoints.pI, controlPoints.pG ).ToLinearMatrix();
      this.ref_G_I = new ReferSpline( controlPoints.pG, controlPoints.pI, controlPoints.weights,
                                      order, smoothing,
                                      simplify, tolerance, rejectFraction );
      console.writeln( format( "Loaded %d control points (metadata version %s).", controlPoints.pI.length, version ) );
   };

   this.RectExpand = function( r, p )
   {
      if ( p )
      {
         let ra0 = Math.deg( this.projection.ra0 );
         let x = p.x;
         if ( x < ra0 - 180 )
            x += 360;
         if ( x > ra0 + 180 )
            x -= 360;

         if ( r )
         {
            r.x0 = Math.min( r.x0, x );
            r.x1 = Math.max( r.x1, x );
            r.y0 = Math.min( r.y0, p.y, 90 );
            r.y1 = Math.max( r.y1, p.y, -90 );
         }
         else
            r = new Rect( x, p.y, x, p.y );
      }
      return r;
   };

   this.FindImageBounds = function()
   {
      let bounds = null;

      let numSteps = 32;
      let sx = this.width/(numSteps - 1);
      let sy = this.height/(numSteps - 1);
      for ( let y = 0; y < numSteps; ++y )
         for ( let x = 0; x < numSteps; ++x )
            bounds = this.RectExpand( bounds, this.Convert_I_RD( new Point( x*sx, y*sy ), true/*unscaled*/ ) );
      let ra0 = Math.deg( this.projection.ra0 );

      // Check North Pole
      let north_I = this.Convert_RD_I( new Point( ra0, 90 ), true/*unscaled*/ );
      if ( north_I
        && north_I.x >= 0
        && north_I.x < this.width
        && north_I.y >= 0
        && north_I.y < this.height )
      {
         bounds.x0 = 0;
         bounds.x1 = 360;
         bounds.y1 = +90;
      }

      // Check South Pole
      let south_I = this.Convert_RD_I( new Point( ra0, -90 ), true/*unscaled*/ );
      if ( south_I
        && south_I.x >= 0
        && south_I.x < this.width
        && south_I.y >= 0
        && south_I.y < this.height )
      {
         bounds.x0 = 0;
         bounds.x1 = 360;
         bounds.y0 = -90;
      }

      bounds.x0 /= 15;
      bounds.x1 /= 15;

      return bounds;
   };

   this.Convert_I_RD = function( pI, unscaled )
   {
      let spI = pI;
      if ( !unscaled )
      {
         spI.x /= this.scalingFactor;
         spI.y /= this.scalingFactor;
      }
      return this.projection.Inverse( this.ref_I_G.Apply( spI ) );
   };

   this.Convert_RD_I = function( pRD, unscaled )
   {
      let pG = this.projection.Direct( pRD );
      if ( pG )
      {
         let pI = this.ref_G_I.Apply( pG );
         if ( !unscaled )
         {
            pI.x *= this.scalingFactor;
            pI.y *= this.scalingFactor;
         }
         return pI;
      }
      return null;
   };

   this.Convert_RD_I_Points = function( pointsRD, unscaled )
   {
      let pointsG = [];
      for ( let i = 0; i < pointsRD.length; ++i )
      {
         let pG = this.projection.Direct( pointsRD[i] );
         if ( pG )
            pointsG.push( pG );
      }
      let pointsI = this.ref_G_I.ApplyToPoints( pointsG );
      if ( !unscaled )
         for ( let i = 0; i < pointsI.length; ++i )
            pointsI[i].mul( this.scalingFactor );
      return pointsI;
   };

   this.DistanceI = function( p1, p2, unscaled )
   {
      return ImageMetadata.Distance( this.Convert_I_RD( p1, unscaled ), this.Convert_I_RD( p2, unscaled ) );
   };

   this.CheckOscillation = function( pRD, pI )
   {
      let spI;
      if ( !pI )
         spI = this.Convert_RD_I( pRD, true/*unscaled*/ );
      else
         spI = new Point( pI.x/this.scalingFactor, pI.y/this.scalingFactor );
      let pG = this.projection.Direct( pRD );
      let pIl = this.ref_I_G_linear.inverse().Apply( pG );
      return (pIl.x - spI.x)*(pIl.x - spI.x) + (pIl.y - spI.y)*(pIl.y - spI.y) < this.width*this.height/4;
   };
}

ImageMetadata.prototype = new ObjectWithSettings;

ImageMetadata.Distance = function( cp1, cp2 )
{
   if ( !cp1 || !cp2 )
      return NaN;
   let dX = Math.abs( cp1.x - cp2.x );
   let cosX = DMath.cos( dX );
   let sinX = DMath.sin( dX );
   let cosY1 = DMath.cos( cp1.y );
   let cosY2 = DMath.cos( cp2.y );
   let sinY1 = DMath.sin( cp1.y );
   let sinY2 = DMath.sin( cp2.y );
   let K = cosY1*sinY2 - sinY1*cosY2*cosX;
   return DMath.atan2( Math.sqrt( cosY2*sinX*cosY2*sinX + K*K ),
                       sinY1*sinY2 + cosY1*cosY2*cosX );
};

ImageMetadata.DistanceFast = function( cp1, cp2 )
{
   if ( !cp1 || !cp2 )
      return NaN;
   return DMath.acos( DMath.sin( cp1.y ) * DMath.sin( cp2.y ) +
                      DMath.cos( cp1.y ) * DMath.cos( cp2.y ) * DMath.cos( cp1.x - cp2.x ) );
};

// ----------------------------------------------------------------------------

/*
 * DMSangle: Helper class to simplify the use of angles in DMS format.
 */
function DMSangle()
{
   this.deg = 0;
   this.min = 0;
   this.sec = 0;
   this.sign = 1;

   this.GetValue = function()
   {
      return this.sign*(this.deg + (this.min + this.sec/60)/60);
   };

   this.ToString = function( hours )
   {
      let plus = hours ? "" : "+";
      if ( this.deg != null && this.min != null && this.sec != null && this.sign != null )
         return ((this.sign < 0) ? "-": plus) +
               format( "%02d %02d %0*.*f", this.deg, this.min, hours ? 6 : 5, hours ? 3 : 2, this.sec );
      return "<* invalid *>";
   };
}

DMSangle.FromString = function( coordStr, mindeg, maxdeg, noSecs )
{
   let match = coordStr.match( noSecs ? "'?([+-]?)([0-9]*)[ :]([0-9]*(.[0-9]*)?)'?" :
                                        "'?([+-]?)([0-9]*)[ :]([0-9]*)[ :]([0-9]*(.[0-9]*)?)'?" );
   if ( match == null )
      return null;
   let coord = new DMSangle();
   if ( match.length < (noSecs ? 3 : 4) )
      throw new Error( "Invalid coordinates" );
   coord.deg = parseInt( match[2], 10 );
   if ( coord.deg < mindeg || coord.deg > maxdeg )
      throw new Error( "Invalid coordinates" );
   coord.min = parseInt( match[3], 10 );
   if ( coord.min < 0 || coord.min >= 60 )
      throw new Error( "Invalid coordinates (minutes)" );
   if ( noSecs )
      coord.sec = 0;
   else
   {
      coord.sec = parseFloat( match[4] );
      if ( coord.sec < 0 || coord.sec >= 60 )
         throw new Error( "Invalid coordinates (seconds)" );
   }
   coord.sign = (match[1] == '-') ? -1 : 1;
   return coord;
};

DMSangle.FromAngle = function( angle )
{
   let coord = new DMSangle();
   if ( angle < 0 )
   {
      coord.sign = -1;
      angle = -angle;
   }
   coord.deg = Math.trunc( angle );
   coord.min = Math.trunc( (angle - coord.deg)*60 );
   coord.sec = (angle - coord.deg - coord.min/60)*3600;

   if ( coord.sec > 59.999 )
   {
      coord.sec = 0;
      coord.min++;
      if ( coord.min == 60 )
      {
         coord.min = 0;
         coord.deg++;
      }
   }

   return coord;
};

// ----------------------------------------------------------------------------

Point.prototype.PrintAsRaDec = function()
{
   console.writeln( "RA: ", DMSangle.FromAngle( this.x/15 ).ToString(),
                    "  Dec: ", DMSangle.FromAngle( this.y ).ToString() );
};

Point.prototype.Print = function()
{
   console.writeln( format( "%f %f", this.x, this.y ) );
};

// ----------------------------------------------------------------------------

Matrix.prototype.Apply = function( p )
{
   let matrixP = new Matrix( [p.x, p.y, 1], 3, 1 );
   let p1 = this.mul( matrixP );
   return new Point( p1.at( 0, 0 ), p1.at( 1, 0 ) );
};

Matrix.prototype.ApplyToPoints = function( points )
{
   let result = [];
   for ( let i = 0; i < points.length; ++i )
      result.push( this.Apply( points[i] ) );
   return result;
};

Matrix.prototype.Print = function()
{
   for ( let y = 0; y < this.rows; ++y )
   {
      console.write( "   " );
      for ( let x = 0; x < this.cols; ++x )
         //console.write( format( "%+20.12f", this.at( y, x ) ) );
         console.write( format( "%+20g", this.at( y, x ) ) );
      console.writeln( "" );
   }
};

Matrix.prototype.toString = function()
{
   let str = "[";
   for ( let row = 0; row < this.rows; ++row )
   {
      let rowStr = "[";
      for ( let col = 0; col < this.columns; ++col )
      {
         if ( col > 0 )
            rowStr += ";";
         rowStr += this.at( row, col ).toString();
      }
      str += rowStr + "]";
   }
   return str + "]";
};

// ----------------------------------------------------------------------------

function ReferNPolyn( polDegree )
{
   this.__base__ = Matrix;
   this.__base__( 2, ((polDegree + 1)*(polDegree + 2))/2 );
   this.polDegree = polDegree;
};

ReferNPolyn.prototype = new Matrix;

ReferNPolyn.prototype.Apply = function( p )
{
   let coef = this.GetPointCoef( p );
   let x = 0, y = 0;
   for ( let i = 0; i < coef.length; ++i )
   {
      x += coef[i]*this.at( 0, i );
      y += coef[i]*this.at( 1, i );
   }
   return new Point( x, y );
};

ReferNPolyn.prototype.ApplyToPoints = function( points )
{
   let result = [];
   for ( let i = 0; i < points.length; ++i )
      result.push( this.Apply( points[i] ) );
   return result;
};

ReferNPolyn.prototype.GetPointCoef = function( p )
{
   let values = Array( this.GetNumCoef() );
   let idx = 0;
   for ( let o = 0; o <= this.polDegree; ++o )
   {
      let x = 1;
      for ( let i = 0; i <= o; ++i )
      {
         values[idx+o-i] = x;
         x *= p.x;
      }
      let y = 1;
      for ( let i = 0; i <= o; ++i )
      {
         values[idx+i] *= y;
         y *= p.y;
      }
      idx += o+1;
   }
   return values;
};

ReferNPolyn.prototype.GetNumCoef = function( degree )
{
   if ( degree == null )
      return ((this.polDegree + 1)*(this.polDegree + 2))/2;
   return ((degree + 1)*(degree + 2))/2;
};

ReferNPolyn.prototype.ToLinearMatrix = function()
{
   let m = new Matrix( 3, 3 );
   m.at( 0, 0, this.at( 0, 1 ) ); m.at( 0, 1, this.at( 0, 2 ) ); m.at( 0, 2, this.at( 0, 0 ) );
   m.at( 1, 0, this.at( 1, 1 ) ); m.at( 1, 1, this.at( 1, 2 ) ); m.at( 1, 2, this.at( 1, 0 ) );
   m.at( 2, 0, 0 );               m.at( 2, 1, 0);                m.at( 2, 2, 1 );
   return m;
};

ReferNPolyn.prototype.FromLinearMatrix = function( m )
{
   let ref = new ReferNPolyn( 1 );
   ref.at( 0, 0, m.at( 0, 2 ) ); ref.at( 0, 1, m.at( 0, 0 ) ); ref.at( 0, 2, m.at( 0, 1 ) );
   ref.at( 1, 0, m.at( 1, 2 ) ); ref.at( 1, 1, m.at( 1, 0 ) ); ref.at( 1, 2, m.at( 1, 1 ) );
   return ref;
};

// ----------------------------------------------------------------------------

function ReferSpline( p1, p2, weights, order, smoothing, simplify, tolerance, rejectFraction )
{
   this.order = (order == undefined || order == null) ? 2 : order;
   this.smoothing = (smoothing == undefined || smoothing == null) ? 0.015 : smoothing;
   this.simplify = (simplify == undefined || simplify == null) ? true : simplify;
   this.tolerance = (tolerance == undefined || tolerance == null) ? 0.05 : tolerance;
   this.rejectFraction = (rejectFraction == undefined || rejectFraction == null) ? 0.10 : rejectFraction;
   this.truncated = false;
   if ( p1 && p2 )
      this.InitFromControlPoints( p1, p2, weights );
}

ReferSpline.prototype.InitFromControlPoints = function( p1, p2, weights )
{
   let x = [];
   let y = [];
   let zx = [];
   let zy = [];
   let w = weights ? [] : null;
   let xmin = Number.MAX_VALUE, xmax = -Number.MAX_VALUE;
   let ymin = Number.MAX_VALUE, ymax = -Number.MAX_VALUE;
   let zxmin = Number.MAX_VALUE, zxmax = -Number.MAX_VALUE;
   let zymin = Number.MAX_VALUE, zymax = -Number.MAX_VALUE;
   for ( let i = 0; i < p1.length; ++i )
      if ( p1[i] && p2[i] )
      {
         x.push( p1[i].x );
         y.push( p1[i].y );
         zx.push( p2[i].x );
         zy.push( p2[i].y );

         if ( weights )
            w.push( weights[i] );

         if ( p1[i].x < xmin )
            xmin = p1[i].x;
         if ( p1[i].x > xmax )
            xmax = p1[i].x;

         if ( p1[i].y < ymin )
            ymin = p1[i].y;
         if ( p1[i].y > ymax )
            ymax = p1[i].y;

         if ( p2[i].x < zxmin )
            zxmin = p2[i].x;
         if ( p2[i].x > zxmax )
            zxmax = p2[i].x;

         if ( p2[i].y < zymin )
            zymin = p2[i].y;
         if ( p2[i].y > zymax )
            zymax = p2[i].y;
      }

   let vx = new Vector( x );
   let vy = new Vector( y );
   let vzx = new Vector( zx );
   let vzy = new Vector( zy );

   this.truncated = false;

   if ( this.simplify )
   {
      let dx = xmax - xmin;
      let dy = ymax - ymin;
      let dzx = zxmax - zxmin;
      let dzy = zymax - zymin;
      let dxy = Math.sqrt( dx*dx + dy*dy );
      let dz = Math.sqrt( dzx*dzx + dzy*dzy );
      let res = dz/dxy; // deg/px

      let gToI = zxmin >= 0 && zxmax > 0 && zymin >= 0 && zymax > 0;
      let SS = new SurfaceSimplifier;
      SS.rejectionEnabled = true;
      SS.rejectFraction = this.rejectFraction;
      SS.centroidInclusionEnabled = true;

      let SX, tx = this.tolerance;
      for ( let it = 0;; )
      {
         SS.tolerance = gToI ? tx : tx*res;
         SX = SS.simplify( vx, vy, vzx );
         if ( SX[0].length <= WCS_SIMPLIFIER_TARGET_SPLINE_POINTS )
         {
            if ( tx <= this.tolerance )
               break;
            tx *= 0.9;
         }
         else if ( SX[0].length > WCS_MAX_SPLINE_POINTS )
         {
            if ( tx >= 16.0 )
               break;
            tx *= 1.1;
         }
         else
            break;

         if ( ++it == 200 ) // stalled?
         {
            gc();
            break;
         }
      }
      if ( SX[0].length > WCS_MAX_SPLINE_POINTS )
      {
         console.warningln( format( "<end><cbr>** Warning: Truncating spline control points, X-axis (%d -> %d)",
                                    SX[0].length, WCS_MAX_SPLINE_POINTS ) );
         SX[0] = new Vector( SX[0], 0, WCS_MAX_SPLINE_POINTS );
         SX[1] = new Vector( SX[1], 0, WCS_MAX_SPLINE_POINTS );
         SX[2] = new Vector( SX[2], 0, WCS_MAX_SPLINE_POINTS );
         this.truncated = true;
      }
      this.splineX = new SurfaceSpline;
      this.splineX.smoothing = this.smoothing;
      this.splineX.order = this.order;
      this.splineX.initialize( SX[0], SX[1], SX[2] );

      let SY, ty = tx;
      for ( let it = 0;; )
      {
         SS.tolerance = gToI ? ty : ty*res;
         SY = SS.simplify( vx, vy, vzy );
         if ( SY[0].length <= WCS_SIMPLIFIER_TARGET_SPLINE_POINTS )
         {
            if ( ty <= this.tolerance )
               break;
            ty *= 0.9;
         }
         else if ( SY[0].length > WCS_MAX_SPLINE_POINTS )
         {
            if ( ty >= 16.0 )
               break;
            ty *= 1.1;
         }
         else
            break;

         if ( ++it == 200 ) // stalled?
         {
            gc();
            break;
         }
      }
      if ( SY[0].length > WCS_MAX_SPLINE_POINTS )
      {
         console.warningln( format( "<end><cbr>** Warning: Truncating spline control points, Y-axis (%d -> %d)",
                                    SY[0].length, WCS_MAX_SPLINE_POINTS ) );
         SY[0] = new Vector( SY[0], 0, WCS_MAX_SPLINE_POINTS );
         SY[1] = new Vector( SY[1], 0, WCS_MAX_SPLINE_POINTS );
         SY[2] = new Vector( SY[2], 0, WCS_MAX_SPLINE_POINTS );
         this.truncated = true;
      }
      this.splineY = new SurfaceSpline;
      this.splineY.smoothing = this.smoothing;
      this.splineY.order = this.order;
      this.splineY.initialize( SY[0], SY[1], SY[2] );

      this.tolerance = Math.max( tx, ty );
      this.simpleX = SX;
      this.simpleY = SY;

      console.writeln( format( "<end><cbr>Simplified surfaces: tolerance = %.2f %s | %s:%4d | %s:%4d",
                               gToI ? this.tolerance : this.tolerance*res*3600,
                               gToI ? "px" : "as",
                               gToI ? "X" : "l", SX[0].length,
                               gToI ? "Y" : "b", SY[0].length ) );
   }
   else
   {
      let vw;
      if ( w )
         vw = new Vector( w );
      if ( vx.length > WCS_MAX_SPLINE_POINTS )
      {
         console.warningln( format( "<end><cbr>** Warning: Truncating spline control points (%d -> %d)",
                                    vx.length, WCS_MAX_SPLINE_POINTS ) );
         vx = new Vector( vx, 0, WCS_MAX_SPLINE_POINTS );
         vy = new Vector( vy, 0, WCS_MAX_SPLINE_POINTS );
         vzx = new Vector( vzx, 0, WCS_MAX_SPLINE_POINTS );
         vzy = new Vector( vzy, 0, WCS_MAX_SPLINE_POINTS );
         if ( w )
            vw = new Vector( vw, 0, WCS_MAX_SPLINE_POINTS );
         this.truncated = true;
      }

      this.splineX = new SurfaceSpline;
      this.splineX.smoothing = this.smoothing;
      this.splineX.order = this.order;
      if ( w )
         this.splineX.initialize( vx, vy, vzx, vw );
      else
         this.splineX.initialize( vx, vy, vzx );

      this.splineY = new SurfaceSpline();
      this.splineY.smoothing = this.smoothing;
      this.splineY.order = this.order;
      if ( w )
         this.splineY.initialize( vx, vy, vzy, vw );
      else
         this.splineY.initialize( vx, vy, vzy );

      if ( this.simplify )
      {
         this.simpleX = [vx, vy, vzx];
         this.simpleY = [vx, vy, vzy];
      }
   }
};

ReferSpline.prototype.Apply = function( p )
{
   return new Point( this.splineX.evaluate( p ), this.splineY.evaluate( p ) );
};

ReferSpline.prototype.ApplyToPoints = function( points )
{
   let vx = this.splineX.evaluate( points );
   let vy = this.splineY.evaluate( points );
   let result = [];
   for ( let i = 0; i < points.length; ++i )
      result.push( new Point( vx.at( i ), vy.at( i ) ) );
   return result;
};

// ----------------------------------------------------------------------------

function MultipleLinearRegression( polDegree, coords1, coords2 )
{
   if ( coords1.length != coords2.length )
      throw "Input arrays of different size in Multiple Linear Regression";
   let numSamples =0;
   for ( let i = 0; i < coords1.length; ++i )
      if ( coords1[i] && coords2[i] )
         numSamples++;
   //console.writeln("Samples: ", numSamples);
   if ( numSamples < 4 )
      throw "There are too few valid samples";
   // Uses independent multiple linear regression for x and y
   // The model is: Y = X * B + err
   // The regresand Y contains the x (or y) of the predicted coordinates coords2
   // The regresors X contains the vectors (x,y,1) with the source coordinates coords1
   // The parameter vector B contains the factors of the expression xc = xi*B0 + yi*B1 + B2
   let ref_1_2 = new ReferNPolyn( polDegree );
   let numCoefs=ref_1_2.GetNumCoef();
   let Y1 = new Matrix( numSamples, 1 );
   let Y2 = new Matrix( numSamples, 1 );
   let X = new Matrix( numSamples, numCoefs );
   let row = 0;
   for ( let i = 0; i < coords1.length; ++i )
   {
      if ( coords1[i] && coords2[i] )
      {
         //console.writeln(coords1[i]," ",coords2[i]);
         Y1.at( row, 0, coords2[i].x );
         Y2.at( row, 0, coords2[i].y );

         let Xval = ref_1_2.GetPointCoef( coords1[i] );
         for ( let c = 0; c < numCoefs; ++c )
            X.at( row, c, Xval[c] );
         row++;
      }
   }

   // Solve the two multiple regressions
   let XT = X.transpose();
   let XT_X_inv_XT = (XT.mul( X )).inverse().mul( XT );
   let B1 = XT_X_inv_XT.mul( Y1 );
   let B2 = XT_X_inv_XT.mul( Y2 );

   // Create the correction matrix that transform from coords1 to coords2
   //console.writeln( "B1:" ); B1.Print();
   //console.writeln( "B2:" ); B2.Print();
   for ( let i = 0; i < numCoefs; ++i )
   {
      ref_1_2.at( 0, i, B1.at( i, 0 ) );
      ref_1_2.at( 1, i, B2.at( i, 0 ) );
   }
   //console.writeln( "Correction matrix:" );
   //ref_1_2.Print();

   // Calculate R2 and RMS
/*   let SSR = 0;
   for ( let i = 0; i < coords1.length; ++i )
   {
      if ( coords1[i] && coords2[i] )
      {
         let c2 = ref_1_2.Apply( coords1[i] );
         let errX = c2.x-coords2[i].x;
         let errY = c2.y-coords2[i].y;
         //console.writeln( format( "%f;%f;%f;%f", coords1[i].x, coords1[i].y, errX, errY ) );
         SSR += errX*errX + errY*errY;
      }
   }
   let RMSerr = Math.sqrt( SSR/numSamples );*/

   //return { ref_1_2: ref_1_2, rms: RMSerr };
   return ref_1_2;
}

// ----------------------------------------------------------------------------

function MultipleLinearRegressionHelmert( coords1, coords2, ref1, ref2 )
{
   if ( coords1.length != coords2.length )
      throw "Input arrays of different size in Multiple Linear Regression";
   let numSamples = 0;
   for ( let i = 0; i < coords1.length; ++i )
      if ( coords1[i] && coords2[i] )
         numSamples++;
   //console.writeln( "Samples: ", numSamples );
   if ( numSamples < 4 )
      throw "There are too few valid samples";

   // Detect mirror case
   let refMirror = MultipleLinearRegression( 1, coords1, coords2 ).ToLinearMatrix();
   let mirrorFactor = (refMirror.at( 0, 1 ) * refMirror.at( 1, 0 ) > 0) ? 1 : -1;

   // Uses independent multiple linear regression for x and y
   // The model is: Y = X * B + err
   // The regresand Y contains the x (or y) of the predicted coordinates coords2
   // The regresors X contains the vectors (x,y,1) with the source coordinates coords1
   // The parameter vector B contains the factors of the expression xc = xi*B0 + yi*B1 + B2
   let Y = new Matrix( numSamples*2, 1 );
   let X = new Matrix( numSamples*2, 2 );
   let row = 0;
   for ( let i = 0; i < coords1.length; ++i )
      if ( coords1[i] && coords2[i] )
      {
         //console.writeln( coords1[i], " ", coords2[i] );
         Y.at( row*2,     0, coords2[i].x - ref2.x );
         Y.at( row*2 + 1, 0, coords2[i].y - ref2.y );

         X.at( row*2,     0,  coords1[i].x - ref1.x );
         X.at( row*2,     1,  coords1[i].y - ref1.y );
         X.at( row*2 + 1, 1,  mirrorFactor*(coords1[i].x - ref1.x) );
         X.at( row*2 + 1, 0, -mirrorFactor*(coords1[i].y - ref1.y) );

         ++row;
      }

   // Solve the two multiple regressions
   let XT = X.transpose();
   let XT_X_inv_XT = (XT.mul( X )).inverse().mul( XT );
   let B = XT_X_inv_XT.mul( Y );

   // Create the correction matrix that transform from coords1 to coords2
   let m = new Matrix( 3, 3 );
   m.at( 0, 0, B.at( 0, 0 ) );              m.at( 0, 1, B.at( 1, 0 ) );               m.at( 0, 2, 0 );
   m.at( 1, 0, mirrorFactor*B.at( 1, 0 ) ); m.at( 1, 1, -mirrorFactor*B.at( 0, 0 ) ); m.at( 1, 2, 0 );
   m.at( 2, 0, 0 );                         m.at( 2, 1, 0 );                          m.at( 2, 2, 1 );
   //console.writeln( "m" ); m.Print();

   let t1 = new Matrix( 1, 0, -ref1.x,
                        0, 1, -ref1.y,
                        0, 0, 1 );
   let t2 = new Matrix( 1, 0, ref2.x,
                        0, 1, ref2.y,
                        0, 0, 1 );
   let ref_1_2 = t2.mul( m.mul( t1 ) );
   //console.writeln( "ref_1_2" ); ref_1_2.Print();
   //console.writeln( "refMirror" ); refMirror.Print();
   return ref_1_2;
}

// ----------------------------------------------------------------------------

function ApplySTF( view, stf )
{
   let HT = new HistogramTransformation;
   if ( view.image.isColor )
   {
      let stfActive = false;
      for ( let i = 0; i < 3 && !stfActive; ++i )
         stfActive |= stf[i][1] != 0 || stf[i][0] != 0.5 || stf[i][2] != 1;
      if ( !stfActive )
         return;
      HT.H = [ [ stf[0][1], stf[0][0], stf[0][2], 0, 1 ],
               [ stf[1][1], stf[1][0], stf[1][2], 0, 1 ],
               [ stf[2][1], stf[2][0], stf[2][2], 0, 1 ],
               [ 0,         0.5,       1,         0, 1 ],
               [ 0,         0.5,       1,         0, 1 ] ];
   }
   else
   {
      if ( stf[0][1] == 0 && stf[0][0] == 0.5 && stf[0][2] == 1 )
         return;
      HT.H = [ [ 0,         0.5,       1,         0, 1 ],
               [ 0,         0.5,       1,         0, 1 ],
               [ 0,         0.5,       1,         0, 1 ],
               [ stf[0][1], stf[0][0], stf[0][2], 0, 1 ],
               [ 0,         0.5,       1,         0, 1 ] ];
   }

   console.writeln( format( "<b>Applying STF to '%ls'</b>:\x1b[38;2;100;100;100m", view.id ) );
   HT.executeOn( view, false/*swapFile*/ );
   console.write( "\x1b[0m" );
}
