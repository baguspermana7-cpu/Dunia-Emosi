/* Used in the Kids - Drawing Tool page */
function getChromeVersion() {
    var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : false;
}

(function() {
  // only run this script on the drawing tool page
  if ($('#drawing-tool').length === 0) {
    return;
  }

  // Set the drawing tool config
  var _default_conf = window.drawing_tool_config || null;
  var config = {
    download_script_url: _default_conf.download_script_url || null,
    legal: { // settings for legal message that is rendered to the downloaded image
      text: _default_conf.legal_message || null,
      font_size: 9,
      font_name: 'Utility',
      line_height: 12,
      color: 'black',
      wrap_at: 550,
      padding_top: 3,
      padding_bottom: 5
    },
    logo: { // settings for the logo that is rendered to the downloaded image
      width: 166,
      position: {x: 0, y: 4},
      padding_left: 23,
      padding_right: 23
    },
    auto_close_drawer_time: 2, // in seconds
    line_art: _default_conf.line_art || false,
    crayon: {
      tool: {asset: 'Resources/img/kids/art-tool/tool-crayon.png'},
      cursor: {asset: 'Resources/img/kids/art-tool/cursor-crayon.png', hotspot: {x: 14, y: 232}},
      head: {asset: 'Resources/img/kids/art-tool/head-crayon.png', min_distance: 2}
    },
    marker: {
      tool: {asset: 'Resources/img/kids/art-tool/tool-marker.png'},
      cursor: {asset: 'Resources/img/kids/art-tool/cursor-marker.png', hotspot: {x: 20, y: 238}},
      head: {asset: 'Resources/img/kids/art-tool/head-marker.png', min_distance: 1}
    },
    brush: {
      tool: {asset: 'Resources/img/kids/art-tool/tool-brush.png'},
      cursor: {asset: 'Resources/img/kids/art-tool/cursor-brush.png', hotspot: {x: 48, y: 230}},
      head: {asset: 'Resources/img/kids/art-tool/head-brush.png', min_distance: 1}
    },
    eraser: {
      tool: {asset: 'Resources/img/kids/art-tool/tool-eraser.png'},
      cursor: {asset: 'Resources/img/kids/art-tool/cursor-eraser.png', hotspot: {x: 50, y: 78}},
      head: {asset: 'Resources/img/kids/art-tool/head-eraser.png', min_distance: 3}
    },
    bucket: {asset: 'Resources/img/kids/art-tool/tool-bucket.png'},
    palette_swatch: {asset: 'Resources/img/kids/art-tool/palette-swatch.png'},
    drawing_colors: ['#ff0000', '#ff7e00', '#fff000', '#9fd300', '#00742f', '#00bb96', '#009cdb', '#6d44b7', '#df64c7', '#925a34', '#9b9b9b', '#2f2f2f'],
    preload_assets: [
      'Resources/img/kids/art-tool/btn-close.png',
      'Resources/img/kids/art-tool/btn-continue.png',
      'Resources/img/kids/art-tool/btn-done.png',
      'Resources/img/kids/art-tool/btn-drawer-handle.png',
      'Resources/img/kids/art-tool/btn-print.png',
      'Resources/img/kids/art-tool/btn-save.png',
      'Resources/img/kids/art-tool/btn-trash.png',
      'Resources/img/kids/art-tool/btn-x.png',
      'Resources/img/kids/art-tool/done-preview-bg.png',
      'Resources/img/kids/art-tool/done-preview-corner.png',
      'Resources/img/kids/art-tool/done-preview-pin.png'
    ]
  };

  // Get the distance between 2 points
  function distanceBetween(point1, point2) {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
  }

  // Get the angle between 2 points
  function angleBetween(point1, point2) {
    return Math.atan2(point2.x - point1.x, point2.y - point1.y);
  }

  // Gets the coordinates of an event relative to the canvas
  function getEventPositionRelativeToCanvas(e, touch_identifier) {
    var x, y;
    if (!e.changedTouches || !e.changedTouches.length) {
      x = e.pageX;
      y = e.pageY;
    }
    else {
      if (typeof touch_identifier === 'undefined') {
        x = e.changedTouches[0].pageX;
        y = e.changedTouches[0].pageY;
      }
      else {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touch_identifier) {
            x = e.changedTouches[i].pageX;
            y = e.changedTouches[i].pageY;
          }
        }
      }
    }

    if (typeof x !== 'number') {
      return {x: 0, y: 0};
    }

    return {
      x: Math.round((x - cdraw.canvas_offset.x) * 1 / cdraw.canvas_scale),
      y: Math.round((y - cdraw.canvas_offset.y) * 1 / cdraw.canvas_scale)
    };
  }




  var cdraw = {
    canvas: null, // the canvas displayed in the page
    canvas_ctx: null, // the context of the canvas displayed in the page
    canvas_scale: 1, // the scale of the canvas that is set by the responsive plugin, through css transform
    canvas_offset: {x: 0, y: 0},// offset position of the canvas in page

    buffer_canvas: null, // buffer used to merge all canvases (brush canvas, line art canvas) before drawing to the visible canvas
    buffer_canvas_ctx: null,

    brush_canvas: null, // buffer canvas used by all brush tools (crayon, marker, brush, eraser)
    brush_canvas_ctx: null, // the context of the brush canvas

    line_art_canvas: null, // canvas used to draw the line art
    line_art_canvas_ctx: null, // context of the line art canvas

    width: 0, // canvas width
    height: 0, // canvas height

    assets: {}, // images used by the drawing tool, gathered into a single object and preloaded
    assets_loaded: false, // becomes true when all the assets are loaded, used to remove the loader

    canvas_positioned: false, // becomes true when the canvas is positioned and scaled by the responsiveness plugin, used to remove the loader

    current_tool: null, // one of the cdraw.tools
    current_tool_name: null, // name of the current tool (crayon, marker etc)
    current_color: null, // the current color

    fully_loaded: false,

    render_requested: false,

    last_painting_tool_selected: null // the last selected tool that actually paints something (pencil, marker or brush), used to restore it when a color is selected while the eraser is active
  };

  // Adds an asset to the list of assets that are used by the drawing tool
  cdraw.addAsset = function(id, path, store_for_later) {
    this.assets[id] = {
      path: path || false,
      store_for_later: typeof store_for_later === 'boolean' ? store_for_later : true
    };
  };

  // Preloader for the drawing tool assets
  cdraw.preloadAssets = function() {
    var total = 0;
    for (var id in this.assets) {
      // make sure the asset exists
      if (!this.assets.hasOwnProperty(id) || !this.assets[id]) {
        continue;
      }

      total++;

      // create an image and wait for it to load
      var $img = $('<img />');
      $img.one('load error', function() {
        total--;
        if (total === 0) {
          cdraw.assets_loaded = true;
          cdraw.removeLoader();
        }
      });
      $img.attr('src', this.assets[id].path);

      if (this.assets[id].store_for_later) {
        this.assets[id] = $img.get(0);
      }
      else {
        delete this.assets[id];
      }
    }
  };

  // Remove the loader
  // Gets called once all the assets are loaded and on every window responsive-elements-updated until fully loaded
  cdraw.removeLoader = function() {
    // wait for both the assets to be loaded and the canvas to be positioned
    // also skip if already removed the loader
    if ($('#drawing-tool').hasClass('loaded') || !cdraw.assets_loaded || !cdraw.canvas_positioned) {
      return;
    }
    this.fully_loaded = true;

    // render the canvas (to get the line art displayed)
    this.renderLineArt();
    this.render();

    // the assets must be loaded before building the UI
    this.setupToolsUI();

    // select the first color and the crayon tool; this will trigger color and tool selection
    $('#palette-swatch-0').click();
    $('#tool-crayon').click();


    // remove loader
    $('#drawing-tool-loader').remove();
    $('#drawing-tool').addClass('loaded');

    // position the UI and update the offset / scale of the canvas
    cdraw.positionUIWrappers();
    cdraw.setOffsetAndScale();
    cdraw.tools_drawer.autoclose();
  };

  // Initialize the canvas
  cdraw.initializeCanvas = function() {
    var $wrapper = $('#canvas-wrapper');

    // store the canvas size, for easier access, as it remains constant (the canvas is scaled through css transform)
    this.width = $wrapper.width();
    this.height = $wrapper.height();

    // create the canvas that is displayed to the user and append it to the DOM
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas_ctx = this.canvas.getContext('2d');
    $wrapper.append(this.canvas);

    // create the buffer canvas
    this.buffer_canvas = document.createElement('canvas');
    this.buffer_canvas.width = this.width;
    this.buffer_canvas.height = this.height;
    this.buffer_canvas_ctx = this.buffer_canvas.getContext('2d');

    // create the brush canvas; brush tools (crayon, marker, brush) are drawing on this canvas
    this.brush_canvas = document.createElement('canvas');
    this.brush_canvas.width = this.width;
    this.brush_canvas.height = this.height;
    this.brush_canvas_ctx = this.brush_canvas.getContext('2d');

    // create the line art canvas
    this.line_art_canvas = document.createElement('canvas');
    this.line_art_canvas.width = this.width;
    this.line_art_canvas.height = this.height;
    this.line_art_canvas_ctx = this.line_art_canvas.getContext('2d');
  },

  // Sets all the assets that need to be preloaded before removing the loader
  cdraw.setPreloadingAssets = function() {
    this.addAsset('line_art', config.line_art);

    this.addAsset('head_crayon', config.crayon.head.asset);
    this.addAsset('head_marker', config.marker.head.asset);
    this.addAsset('head_brush', config.brush.head.asset);
    this.addAsset('head_eraser', config.eraser.head.asset);

    this.addAsset('cursor_crayon', config.crayon.cursor.asset);
    this.addAsset('cursor_marker', config.marker.cursor.asset);
    this.addAsset('cursor_brush', config.brush.cursor.asset);
    this.addAsset('cursor_eraser', config.eraser.cursor.asset);

    this.addAsset('tool_brush', config.brush.tool.asset);
    this.addAsset('tool_crayon', config.crayon.tool.asset);
    this.addAsset('tool_marker', config.marker.tool.asset);
    this.addAsset('tool_eraser', config.eraser.tool.asset);
    this.addAsset('tool_bucket', config.bucket.asset);
    this.addAsset('palette_swatch', config.palette_swatch.asset);

    for (var i = 0; i < config.preload_assets.length; i++) {
      this.addAsset('preload_asset_' + i, config.preload_assets[i], false);
    }

    // the logo is needed to generate the download and print images
    // although it is already loaded into the page as a background image, it needs to be set as an image tag and it needs to be loaded before drawing it into the canvas
    var logo_path = /url\(['"]?([^'"\)]+)['"]?\)/.exec($('#drawing-tool-logo').css('background-image'));
    this.addAsset('logo', logo_path ? logo_path[1] : null);
  };

  // Builds the DOM elements for the tools and colors palette
  cdraw.setupToolsUI = function() {
    // the eraser and the bucket are not dyed to the selected color, so these assets are added directly
    $(this.assets.tool_eraser).addClass('image').appendTo('#tool-eraser');
    $(this.assets.tool_bucket).addClass('image').appendTo('#tool-bucket');

    // add canvases to the drawing tools (crayon, brush and marker)
    $('#tool-crayon, #tool-marker, #tool-brush').each(function() {
      $('<canvas class="image"></canvas>').appendTo(this);
    });

    // set listener for clicking the drawing tools
    $('#tools .tool').click(function() {
      var $this = $(this);

      // if this is the bucket, then return, as this is handled by the Confirmation popup
      if ($this.is('#tool-bucket')) {
        return;
      }

      // close the drawer when a tool is selected
      // the first tool is automatically selected, so if currently there is no tool selected, then this is the first tool selection and the drawer should remain opened
      if (cdraw.current_tool) {
        cdraw.tools_drawer.close();
      }

      // if this is the pencil, the marker or the brush, then remember it, in order to be able to restore it later
      if ($this.is('#tool-crayon') || $this.is('#tool-marker') || $this.is('#tool-brush')) {
        cdraw.last_painting_tool_selected = $this;
      }

      $('#tools .tool').removeClass('on');
      $this.addClass('on');

      var tool_name = /^tool-(.*)$/.exec($this.attr('id'))[1];
      var conf = {
        head: cdraw.assets['head_' + tool_name],
        cursor: {
          img: cdraw.assets['cursor_' + tool_name],
          hotspot: config[tool_name].cursor.hotspot
        },
        min_distance: config[tool_name].head.min_distance,
        erase: tool_name === 'eraser'
      };

      cdraw.setCurrentTool('brush', conf, tool_name);
      return;
    });

    // create elements for the palette of colors
    var colors = '';
    for (var i = 0; i < config.drawing_colors.length; i++) {
      colors += '<div id="palette-swatch-' + i + '" class="tool"><canvas class="image"></canvas></div>';
    }
    $('#palette').html(colors);

    // dye the canvases in the palette
    for (var i = 0; i < config.drawing_colors.length; i++) {
      var canvas = $('#palette-swatch-' + i + ' canvas').get(0),
          asset = cdraw.assets.palette_swatch,
          color = config.drawing_colors[i];
      this.dyeToolToColor(canvas, asset, color);
    };

    // set listener for clicking the colors
    $('#palette .tool').click(function() {
      $('#palette .tool').removeClass('on');
      $(this).addClass('on');

      var color_idx = parseInt(/^palette-swatch-(.*)$/.exec($(this).attr('id'))[1]),
          color = config.drawing_colors[color_idx];
      cdraw.setCurrentColor(color);

      // when selecting a color, most probably the user wants to paint with it
      // so if the current tool is the eraser, then select the last tool that was used for painting
      if ((cdraw.current_tool === cdraw.tools.brush && cdraw.current_tool.erase)) {
        cdraw.last_painting_tool_selected.click();
      }
    });
  },

  // Paints the canvas of a tool, dyed to a certain color
  // The asset contains the shaddows on the left and the shape on the right
  cdraw.dyeToolToColor = function(canvas, asset, color) {
    // the canvas is only half of the width of the asset
    var half_width = parseInt(asset.width / 2),
        height = asset.height;

    // setting canvas size also clears it
    canvas.width = half_width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');

    // first copy the right side of the asset to the canvas
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(asset, half_width, 0, half_width, height, 0, 0, half_width, height);

    // create a buffer canvas that will be painted with the color
    var buffer = document.createElement('canvas'),
        bctx = buffer.getContext('2d');
   buffer.width = half_width ;
    buffer.height = height;
//buffer.width = 126 ;
  //  buffer.height = 378;
    // fill the buffer with the current color
    bctx.fillStyle = color;
    bctx.fillRect(0, 0, half_width, height);

    // dye the canvas
    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(buffer,0, 0);

    // copy the left side of the asset
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(asset, 0, 0, half_width, height, 0, 0, half_width, height);
  };

  // Used to cache the offset and the scale values of the canvas container
  cdraw.setOffsetAndScale = function() {
    // don't compute the offset and scale until the drawing tool is loaded
    if (!$('#drawing-tool').hasClass('loaded')) {
      return;
    }

    var $wrapper = $('#canvas-wrapper');

    // get the scale
    var matches = /(?:matrix|scale)\((\d+(?:\.\d+)?)[\),]/.exec($wrapper.css('transform'));
    cdraw.canvas_scale = matches ? parseFloat(matches[1]) : 1;

    // get the offset
    var offset = $wrapper.offset();
    cdraw.canvas_offset = {
      x: offset.left,
      y: offset.top
    };
  };

  // Sets the listener for responsive-elements-updated
  cdraw.setupCanvasResponsivenessEventListener = function() {
    $(window).on('responsive-elements-updated', function() {
      // the loader must not be removed until the first canvas positioning
      cdraw.canvas_positioned = true;

      if (!cdraw.fully_loaded) {
        window.setTimeout(cdraw.removeLoader.bind(cdraw), 0);
        return;
      }

      // update the offset and scale
      cdraw.positionUIWrappers();
      cdraw.setOffsetAndScale();
      cdraw.tools_drawer.autoclose();
    });
  };

  // Setup for events that trigger drawing
  // Drawing can occur by:
  // - drag: the usual way of painting, by mousedown/touchstart, multiple mouseover/touchmove, then mouseup/touchend
  // or
  // - hover: achieved by clicking, then hovering the canvas, then clicking again to stop drawing
  cdraw.setupDrawingEventListeners = function() {
    var start_event = null,
        start_event_ts = null, // e.timeStamp is not reliable in FF (http://api.jquery.com/event.timestamp/)
        touch_identifier = null,
        draw_by_hover = false,
        last_position = null,
        is_android = /Android/i.test(navigator.userAgent);


    // ignore mouse events on Android, as even if a mouse is present, touch events are emitted
    $('#canvas-wrapper').on(is_android ? 'touchstart' : 'mousedown touchstart', function(e) {
      e.preventDefault();

      // ignore this event if drawing is already started (when this is a simulated mousedown event or another touchstart, made with a different finger)
      if (start_event && !draw_by_hover) {
        return;
      }

      // ignore mouse events that are not made with the left button
      if (e.type === 'mousedown' && e.button !== 0) {
        return;
      }

      start_event = e;
      start_event_ts = (new Date()).getTime();
      touch_identifier = start_event.type === 'touchstart' ? e.targetTouches[0].identifier : null;
      last_position = getEventPositionRelativeToCanvas(e, touch_identifier);

      // if currently drawing by hover, then the next mouseup will end the drawing by hover
      if (draw_by_hover) {
        return;
      }

      // draw to the canvas
      cdraw.draw(last_position);

      // close the drawer
      cdraw.tools_drawer.close();

      // enable the bucket
      if (cdraw.current_tool_name !== 'eraser') {
        $('#tool-bucket').removeClass('disabled');
      }
    });

    $(document).on(is_android ? 'touchmove' : 'mousemove touchmove', function(e) {
      // ignore this event if drawing is not started yet, or if drawing is made based on touch events and this is a simulated mouse event
      if (!start_event || (start_event.type === 'touchstart' && e.type === 'mousemove')) {
        return;
      }

      e.preventDefault();

      // for touch events, make sure the same finger moved
      if (start_event.type === 'touchstart') {
        var same_finger = false;
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touch_identifier) {
            same_finger = true;
            break;
          }
        }
        if (!same_finger) {
          return;
        }
      }

      // draw to the canvas
      var current_position = getEventPositionRelativeToCanvas(e, touch_identifier);
      cdraw.draw(current_position);
      last_position = current_position;
    });

    $(document).on(is_android ? 'touchend touchcancel' : 'mouseup touchend touchcancel', function(e) {
      // ignore this event if drawing is not started yet, or if drawing is made based on touch events and this is a simulated mouse event
      if (!start_event || (start_event.type === 'touchstart' && e.type === 'mouseup')) {
        return;
      }

      // for touch events, make sure the same finger was released
      if (start_event.type === 'touchstart') {
        var same_finger = false;
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touch_identifier) {
            same_finger = true;
            break;
          }
        }
        if (!same_finger) {
          return;
        }
      }

      // if this is a mouse event, then this is a click
      // start drawing by hovering if this is the first click, or stop drawing if this is the second click
      if (e.type === 'mouseup' && (new Date()).getTime() - start_event_ts < 1500 && Math.abs(start_event.pageX - e.pageX) < 20 && Math.abs(start_event.pageY - e.pageY) < 20) {
        if (!draw_by_hover) {
          // if not already drawing by hovering, then this is the first click
          draw_by_hover = true;
        }
        else {
          // currently drawing by hovering, so this is the second click
          draw_by_hover = false;
          start_event = null;
          cdraw.stop();
        }
      }
      else {
        // this is a touch event or a mouse up that came after some drawing by dragging; stop drawing
        draw_by_hover = false;
        start_event = null;
        cdraw.stop();
      }
    });
  };

  // Sets the current tool, called by clicks on different tools in page
  cdraw.setCurrentTool = function(tool, conf, name) {
    if (this.current_tool && typeof this.current_tool.unload === 'function') {
      this.current_tool.unload.call(this.current_tool);
    }

    if (tool) {
      this.current_tool = this.tools[tool];
      this.current_tool.load.call(this.current_tool, conf);
      this.current_tool_name = name;
    }
    else {
      this.current_tool = null;
      this.current_tool_name = null;
    }
  };

  // Sets the current color, called by clicks on different colors in the colors pallete
  cdraw.setCurrentColor = function(color) {
    this.current_color = color;

    // redraw the tools to the currently selected color
    cdraw.dyeToolToColor($('#tool-crayon canvas').get(0), cdraw.assets.tool_crayon, color);
    cdraw.dyeToolToColor($('#tool-marker canvas').get(0), cdraw.assets.tool_marker, color);
    cdraw.dyeToolToColor($('#tool-brush canvas').get(0), cdraw.assets.tool_brush, color);

    if (this.current_tool && typeof this.current_tool.updateColor === 'function') {
      this.current_tool.updateColor.call(this.current_tool);
    }
  };

  // Delegates drawing to the current tool, called by mouse/touch events
  cdraw.draw = function(position) {
    if (this.current_tool && typeof this.current_tool.draw === 'function') {
      this.current_tool.draw.call(this.current_tool, position);
      this.render();
    }
  };

  // Gets called when drawing stops
  cdraw.stop = function() {
    if (this.current_tool && typeof this.current_tool.stop === 'function') {
      this.current_tool.stop.call(this.current_tool);
      this.render();
    }
  };

  // Draws the line art to the canvas
  cdraw.renderLineArt = function() {
    if (!this.assets.line_art) {
      return;
    }

    this.line_art_canvas_ctx.drawImage(this.assets.line_art, 0, 0, this.assets.line_art.width, this.assets.line_art.height, 0, 0, this.width, this.height);
  },

  // Called after drawing with one of the tools
  // The main canvas is actually rendered in an animation frame
  cdraw.render = function() {
    // if a requestAnimationFrame was made an not processed yet, then skip
    if (this.render_requested) {
      return;
    }
    this.render_requested = true;

    window.requestAnimationFrame(this._render);
  },

  // Renders the canvas displayed to the user
  cdraw._render = function() {
    // clear the buffer and merge all canvases into it
    cdraw.buffer_canvas_ctx.fillStyle = '#fff';
    cdraw.buffer_canvas_ctx.fillRect(0, 0, cdraw.width, cdraw.height);
    cdraw.buffer_canvas_ctx.drawImage(cdraw.brush_canvas, 0, 0);
    cdraw.buffer_canvas_ctx.drawImage(cdraw.line_art_canvas, 0, 0);

    // draw the buffer to the canvas
    cdraw.canvas_ctx.drawImage(cdraw.buffer_canvas, 0, 0);

    // reset the render request flag
    cdraw.render_requested = false;
  };

  cdraw.clearCanvas = function() {
    this.brush_canvas_ctx.clearRect(0, 0, this.width, this.height);
    this.render();
  };

  cdraw.getDrawingImageURI = function(with_logo, with_legal) {
    if (with_logo && !this.assets.logo) {
      with_logo = false;
    }

    if (with_legal && !config.legal.text) {
      with_legal = false;
    }

    // create a new canvas and render the image to it, with optional logo and/or legal note
    var buffer = document.createElement('canvas'),
        bctx = buffer.getContext('2d'),
        drawing_position = {x: 0, y: 0},
        output_size = {width: this.width, height: this.height},
        legal_buffer = with_legal ? document.createElement('canvas') : null,
        legal_buffer_ctx = with_legal ? legal_buffer.getContext('2d') : null;

    // if the logo needs to be rendered, for now just change the size of the output
    if (with_logo) {
      // the logo creates a padding to left and to the right
      output_size.width += config.logo.padding_left + config.logo.padding_right;
      drawing_position.x = config.logo.padding_left;
    }

    // the legal text needs to wrap on multiple lines, so it needs to be rendered before the output canvas, in order to get how much extra height is needed for the output
    if (with_legal) {
      legal_buffer_ctx.font = config.legal.font_size + 'px ' + config.legal.font_name;

      // break the text into words and measure each word individually
      var words = config.legal.text.split(' '),
          lines = [''],
          crt_line = 0,
          crt_line_width = 0,
          space_width = legal_buffer_ctx.measureText(' ').width;

      for (var i = 0; i < words.length; i++) {
        var word_width = legal_buffer_ctx.measureText(words[i]).width;

        // if this word doesn't fit on the current line, create a new one,
        // unless the current line is empty, in which case this word is wider than a line can hold, so it is placed on the current empty line
        if (lines[crt_line] !== '' && crt_line_width + word_width > config.legal.wrap_at) {
          // skip to the next line
          lines.push('');
          crt_line++;
          crt_line_width = 0;
        }

        // add the word to the current line
        var first_word = lines[crt_line] === '';
        lines[crt_line] += (first_word ? '' : ' ');
        lines[crt_line] += words[i];
        crt_line_width += (first_word ? 0 : space_width) + word_width;
      }

      // set the size of the legal canvas
      legal_buffer.width = output_size.width;
      legal_buffer.height = lines.length * config.legal.line_height + config.legal.padding_top + config.legal.padding_bottom;

      // expand the output size
      output_size.height += legal_buffer.height;

      // draw the lines to the canvas
      legal_buffer_ctx.textAlign = 'center';
      legal_buffer_ctx.textBaseline = 'middle';
      legal_buffer_ctx.fillStyle = config.legal.color;
      for (var i = 0; i < lines.length; i++) {
        var x = output_size.width / 2,
            y = config.legal.padding_top + (i + 0.5) * config.legal.line_height;
        legal_buffer_ctx.fillText(lines[i], x, y);
      }
    }

    // set the size of the output canvas
    buffer.width = output_size.width;
    buffer.height = output_size.height;

    // fill the canvas with white
    bctx.fillStyle = '#fff';
    bctx.fillRect(0, 0, buffer.width, buffer.height);

    // draw the main canvas, which is already rendered
    bctx.drawImage(this.canvas, drawing_position.x, drawing_position.y);

    // paint the logo to the canvas
    if (with_logo) {
      // it needs to be positioned at (0, 4) and scaled to a width of 166px
      var logo = this.assets.logo,
          left = config.logo.position.x,
          top = config.logo.position.y,
          width = config.logo.width,
          height = Math.round(logo.height * width / logo.width);
      bctx.drawImage(logo, 0, 0, logo.width, logo.height, left, top, width, height);
    }

    // paint the legal message
    if (with_legal) {
      bctx.drawImage(legal_buffer, 0, this.height);
    }

    return buffer.toDataURL('image/png');
  };

  cdraw.positionUIWrappers = function() {
    var device_type = getDeviceType(),
        device_orientation = getDeviceOrientation(),

        min_distance = 15 * ResponsiveElements.current_scale, // the minimum distance between elements

        $drawing_tool = $('#drawing-tool'),
        $canvas_wrapper = $('#canvas-wrapper'),
        $palette = $('#palette'),
        $tools = $('#tools-wrapper'),
        $logo = $('#drawing-tool-logo'),

        logo_rect = $logo.get(0).getBoundingClientRect(),
        close_btn_rect = $('#drawing-tool-close-btn').get(0).getBoundingClientRect(),
        done_btn_rect = $('#drawing-tool-done-btn').get(0).getBoundingClientRect(),
        palette_rect = $palette.get(0).getBoundingClientRect(),
        tools_rect = $tools.get(0).getBoundingClientRect(),

        drawing_tool_width = $drawing_tool.width(),
        drawing_tool_height = $drawing_tool.height(),
        canvas_wrapper_real_width = $canvas_wrapper.width(),
        canvas_wrapper_real_height = $canvas_wrapper.height(),

        // get the current size of the detached tools drawer and of the closed drawer
        matches = /(?:matrix|scale)\((\d+(?:\.\d+)?)[\),]/.exec($tools.css('transform')),
        tools_drawer_scale = matches ? parseFloat(matches[1]) : 1,
        tools_drawer_detached_width = (529 + 51 + 43) * tools_drawer_scale,
        tools_drawer_closed_width = 145 * tools_drawer_scale,

        tools_drawer_is_detached;

    // First determine if the tools are displayed as a drawer or detached in this viewport
    if (device_orientation === 'portrait') {
      // the tools are always detached in portrait mode
      tools_drawer_is_detached = true;
    }
    else {
      // check if there is enough space between the logo and the right side of the screen to fit the detached tools, the palette and also the canvas with the maximum scale for the current viewport
      var canvas_max_height = drawing_tool_height - 2 * min_distance,
          canvas_max_width = canvas_max_height * canvas_wrapper_real_width / canvas_wrapper_real_height;
      tools_drawer_is_detached = drawing_tool_width - logo_rect.right > palette_rect.width + min_distance + canvas_max_width + min_distance + tools_drawer_detached_width;
    }

    // detach or set the tools as drawer
    if (tools_drawer_is_detached) {
      $tools.addClass('detached');
    }
    else {
      $tools.removeClass('detached');
    }

    // If the tools are displayed in a drawer, the palette stays to the left and the canvas in the remaining space
    if (!tools_drawer_is_detached) {
      // Position the palette
      // The left is set by the responsiveness configuration to be horizontally centered relative to the logo
      var top;
      if (device_type === 'desktop') {
        // In landscape, center the palette vertically on the screen (the palette is tall, with all colors in one column)
        top = (drawing_tool_height - palette_rect.height) / 2;
      }
      else {
        // In portrait, center the palette vertically between the close and the done buttons (the palette is shorter, with colors displayed in 3 columns)
        // This is so that the palette is centered relative to the tools. which are centered vertically between the close and the done buttons
        top = (close_btn_rect.bottom + done_btn_rect.top - palette_rect.height) / 2;
      }
      // Make sure it doesn't overlap the logo; also, allow a smaller min_distance, so that the palette won't get too close to the bottom side of the screen
      top = Math.max(top, logo_rect.bottom + 5 * ResponsiveElements.current_scale);
      $palette.css('top', top + 'px');

      // Position the tools wrapper (the drawer)
      // The tools are positioned to the right side by the responsiveness configuration
      // Center the wrapper vertically between the close and the done buttons
      var top = (close_btn_rect.bottom + done_btn_rect.top - tools_rect.height) / 2;
      $tools.css({
        top: top + 'px',
        right: 0,
        left: 'auto'
      });

      // Scale and position the canvas to fill as much as possible the remaining space
      // Compute the bounds for the canvas
      var canvas_bounds = {
        left_from: Math.max(logo_rect.right, palette_rect.right) + min_distance,
        left_to: Math.min(close_btn_rect.left, done_btn_rect.left, drawing_tool_width - tools_drawer_closed_width) - min_distance,
        top_from: min_distance,
        top_to: drawing_tool_height - min_distance
      };

      // Get the maximum size for the canvas, and based on that compute the scale that needs to be applied
      var max_width = canvas_bounds.left_to - canvas_bounds.left_from,
          max_height = canvas_bounds.top_to - canvas_bounds.top_from,
          canvas_scale;

      if (canvas_wrapper_real_width / canvas_wrapper_real_height > max_width / max_height) {
        canvas_scale = max_width / canvas_wrapper_real_width;
      }
      else {
        canvas_scale = max_height / canvas_wrapper_real_height;
      }

      // Compute the position of the canvas so that it is centered in the available space
      var width = canvas_wrapper_real_width * canvas_scale,
          height = canvas_wrapper_real_height * canvas_scale,
          left = canvas_bounds.left_from + (max_width - width) / 2,
          top = canvas_bounds.top_from + (max_height - height) / 2;

      $canvas_wrapper.css({
        left: left + 'px',
        top: top + 'px',
        transform: 'scale(' + canvas_scale + ')'
      });
    }


    // if the tools are detached, then the palette, the canvas and the tools will stay close to each other, and will be centered in the available space
    if (tools_drawer_is_detached) {
      // First we need to determine the size of the canvas
      var max_width = drawing_tool_width - 2 * min_distance,
          max_height = drawing_tool_height - 2 * min_distance,
          canvas_scale;

      if (device_orientation === 'landscape') {
        // in landscape, leave horizontal space for the logo, the palette and the tools
        max_width -= logo_rect.width + palette_rect.width + tools_drawer_detached_width + 2 * min_distance;
      }
      else {
        // in portrait, leave vertical space for the palette and the tools
        max_height -= palette_rect.height + tools_rect.height + 2 * min_distance;
      }

      // get the scale
      if (canvas_wrapper_real_width / canvas_wrapper_real_height > max_width / max_height) {
        canvas_scale = max_width / canvas_wrapper_real_width;
      }
      else {
        canvas_scale = max_height / canvas_wrapper_real_height;
      }

      // Get the position of the canvas so that it is center in the available space
      var canvas_width = canvas_wrapper_real_width * canvas_scale,
          canvas_height = canvas_wrapper_real_height * canvas_scale;

      // At this point all sizes are known; we need to center and position the 3 items

      // In landscape, all items are centered vertically relative to the screen and the group is centered horizontally in the space between the logo and the right side of the screen
      if (device_orientation === 'landscape') {
        var items_width = palette_rect.width + canvas_width + tools_drawer_detached_width + 2 * min_distance,
            left_position = (drawing_tool_width + logo_rect.right - items_width) / 2;

        $palette.css({
          left: left_position + 'px',
          top: (drawing_tool_height - palette_rect.height) / 2 + 'px'
        });
        left_position += palette_rect.width + min_distance;

        $canvas_wrapper.css({
          left: left_position + 'px',
          top: (drawing_tool_height - canvas_height) / 2 + 'px',
          transform: 'scale(' + canvas_scale + ')'
        });
        left_position += canvas_width + min_distance;

        $tools.css({
          left: left_position + 'px',
          top: (drawing_tool_height - tools_rect.height) / 2 + 'px',
          right: 'auto',
          marginRight: 0
        });
      }

      // In portrait, all items are centered horizontally relative to the screen and the group is centered vertically in the available space
      // Extra checks must be made for the palette to not overlap the logo and for the tools to not overlap the Done button
      if (device_orientation === 'portrait') {
        var items_height = palette_rect.height + canvas_height + tools_rect.height + 2 * min_distance,
            top_position = (drawing_tool_height - items_height) / 2;

        var palette_left = (drawing_tool_width - palette_rect.width) / 2;
        if (palette_left < logo_rect.right + min_distance && top_position < logo_rect.bottom + min_distance) {
          palette_left = (close_btn_rect.left + logo_rect.right - palette_rect.width) / 2;
        }
        $palette.css({
          left: palette_left + 'px',
          top: top_position + 'px'
        });
        top_position += palette_rect.height + min_distance;

        $canvas_wrapper.css({
          left: (drawing_tool_width - canvas_width) / 2 + 'px',
          top:  top_position + 'px',
          transform: 'scale(' + canvas_scale + ')'
        });
        top_position += canvas_height + min_distance;

        var tools_left = (drawing_tool_width - tools_drawer_detached_width) / 2;
        if (top_position + tools_rect.height + min_distance > done_btn_rect.top) {
          tools_left = Math.min(tools_left, done_btn_rect.left - tools_drawer_detached_width - min_distance);
        }

        $tools.css({
          left: tools_left + 'px',
          top: top_position + 'px',
          right: 'auto',
          marginRight: 0
        });
      }
    }


    // Position the Confirmation popups
    var scale_config = {
      desktop: {
        landscape: 0.2516339869281046,
        portrait: 0.1918709150326797
      },
      mobile: {
        landscape: 0.2365359477124183,
        portrait: 0.281515522875817
      }
    };
    var current_scale = scale_config[device_type][device_orientation] * ResponsiveElements.current_scale;
    $('#drawing-tool .drawing-tool-confirm-popup').css('transform', 'translate(-50%, -50%) scale(' + current_scale + ')');

    // Position the Done popup
    var scale_config = {
      desktop: {
        landscape: 0.2450980392156863,
        portrait: 0.245343137254902
      },
      mobile: {
        landscape: 0.1607843137254902,
        portrait: 0.2134803921568627
      }
    };
    var current_scale = scale_config[device_type][device_orientation] * ResponsiveElements.current_scale;
    $('#drawing-tool-done-popup').css('transform', 'translate(-50%, -50%) scale(' + current_scale + ')');

  };

  // Initializes the Drawing tool
  cdraw.initialize = function() {
    // wait for the loader image to load before displaying it
    $('#drawing-tool-loader img').on('load error', function() {
      $('#drawing-tool-loader').css('visibility', 'visible');
    });

    this.cursor.setup();

    this.initializeCanvas();
    this.setupCanvasResponsivenessEventListener();
    this.setupDrawingEventListeners();

    this.tools.brush.setup();
    this.tools_drawer.setup();
    this.popups.setup();

    this.setPreloadingAssets();
    this.preloadAssets();
  };





/* ==========================================================================
   Cursor
   ========================================================================== */
  cdraw.cursor = {
    $img: null,
    hotspot: {x: 0, y: 0},
    last_touch_event_ts: 0,
    visible: false,
    current_position: {x: -10000, y: -10000},

    setup: function() {
      // create the canvas that will hold the cursor; each tool is responsible to update the cursor canvas
      this.$img = $(new Image());
      this.$img.attr('id', 'canvas-cursor');
      this.$img.appendTo('#canvas-wrapper');

      $(document).on('touchstart touchmove touchend touchcancel', this.registerTouchEvent.bind(this));
      $(document).on('mousemove', this.mouseMoved.bind(this));
      $(window).blur(this.hideCursor.bind(this));
    },

    registerTouchEvent: function(e) {
      this.last_touch_event_ts = (new Date()).getTime();

      // hide the cursor, if visible
      if (this.visible) {
        this.$img.css('display', 'none');
        this.visible = false;
      }
    },

    mouseMoved: function(e) {
      // if there was a touchmove in the last second, then this is a simulated mouse event triggered by a touch event, so just ignore
      if ((new Date()).getTime() - this.last_touch_event_ts < 1000) {
        return;
      }

      // get position over canvas and check if the cursor is inside the canvas
      var mouse_position = getEventPositionRelativeToCanvas(e),
          x = mouse_position.x - this.hotspot.x,
          y = mouse_position.y - this.hotspot.y,
          visible = mouse_position.x >= 0 && mouse_position.x < cdraw.width && mouse_position.y >= 0 && mouse_position.y < cdraw.height
      ;

      // if the mouse is acually hovering another element (like the tools drawer or a popup) then hide the cursor
      if ($(e.target).closest('#canvas-wrapper').length === 0) {
        visible = false;
      }

      if (this.visible !== visible) {
        this.$img.css('display', visible ? 'block' : 'none');
      }
      this.visible = visible;

      if (this.visible && (this.current_position.x !== x || this.current_position.y !== y)) {
        this.$img.css({
          left: x + 'px',
          top: y + 'px'
        });
        this.current_position.x = x;
        this.current_position.y = y;
      }
    },

    hideCursor: function() {
      if (!this.visible) {
        return;
      }

      this.visible = false;
      this.$img.css('display', 'none');
    },

    setCursor: function(src, hotspot) {
      this.$img
        .css('transform-origin', hotspot.x + 'px ' + hotspot.y + 'px')
        .removeAttr('width') // IE9 will store the size of the first image; remove the width / height attributes
        .removeAttr('height')
        .attr('src', src)
      ;
      this.hotspot = hotspot;
    }
  };



/* ==========================================================================
   Tools Drawer
   ========================================================================== */
  cdraw.tools_drawer = {
    opened: false,
    was_drawer_on_last_autoclose: null,
    auto_close_timeout: null,

    setup: function() {
      // when cliking the drawer toggle the opened / closed state
      $('#tools-drawer-handle').click(this.toggle.bind(this));

      // close the drawer whenever clicking outside the drawer
      $('body').on('mousedown touchstart', function(e) {
        // if a popup is opened, then don't close the drawer (it needs to stay opened for the clear canvas tool)
        if (cdraw.popups.getOpenedPopup()) {
          return;
        }

        if (!$(e.target).closest('#tools-wrapper').length) {
          cdraw.tools_drawer.close();
        }
      });
    },

    open: function() {
      // if drawer already opened or not in landscape orientation, then return (the drawer is always visible in portrait)
      if (this.opened || getDeviceOrientation() !== 'landscape') {
        return;
      }

      $('#tools-wrapper').css('margin-right', 0);
      this.opened = true;
    },

    close: function() {
      if (!this.opened || getDeviceOrientation() !== 'landscape') {
        return;
      }

      // get the width, the right padding and the scaling of the drawer, to compute the negative margin that needs to be applied to the drawer to get it out of the screen
      var $tools_wrapper = $('#tools-wrapper'),
          width = $tools_wrapper.width(),
          padding_right = parseFloat($tools_wrapper.css('padding-right')),
          matches = /(?:matrix|scale)\((\d+(?:\.\d+)?)[\),]/.exec($tools_wrapper.css('transform')),
          scale = matches ? parseFloat(matches[1]) : 1,
          margin = - scale * (width + padding_right);
      $('#tools-wrapper').css('margin-right', margin + 'px');
      this.opened = false;

      // if the drawer was manually closed, then cancel the auto closing
      window.clearTimeout(this.auto_close_timeout);
      this.auto_close_timeout = null;
    },

    toggle: function() {
      this.opened ? this.close() : this.open();
    },

    // Gets called when the page is loaded and then on each resize
    // It must close the drawer after a few seconds, but only if not alreay opened
    autoclose: function() {
      // check if the tools are in the drawer in this viewport
      var is_drawer = !$('#tools-wrapper').hasClass('detached');

      // if not a drawer, then mark it as closed
      if (!is_drawer) {
        this.opened = false;
        this.was_drawer_in_last_viewport = false;
        window.clearTimeout(this.auto_close_timeout);
        this.auto_close_timeout = null;
        return;
      }


      // if the tools were not in a drawer in the last viewport
      // or if the tools were in a drawer, but it wasn't automatically closed yet (may happen if the browser is slowly resized )
      if (!this.was_drawer_in_last_viewport || this.auto_close_timeout) {
        // open and hide the tools after a few seconds
        this.opened = true;
        window.clearTimeout(this.auto_close_timeout);
        this.auto_close_timeout = window.setTimeout(this.close.bind(this), config.auto_close_drawer_time * 1000);
      }
      else {
        // the tools were a drawer the last time; in this case the tools need to remain exactly as they are
        if (this.opened) {
          // nothing else to do here, as the tools are already positioned correcly
        }
        else {
          // the tools are closed and we want to keep them closed
          // we'll temporary disable the css transitions and we'll call the close() method, which will set the correct marginRight, so the tools remain closed
          $('#tools-wrapper').addClass('disable-transition');
          this.opened = true;
          this.close();
          window.setTimeout(function() {
            $('#tools-wrapper').removeClass('disable-transition');
          }, 0);
        }
      }

      this.was_drawer_in_last_viewport = true;
    }
  };


/* ==========================================================================
   Tools
   ========================================================================== */
  cdraw.tools = {};

/* ==========================================================================
   Brush tool (used for crayon, marker, brush and eraser)
   Basically all tools will be drawing an image between 2 points, with the
   only difference that the eraser has a different operation mode on the
   canvas, and it is not dyed to the selected color
   ========================================================================== */
  cdraw.tools.brush = {
    canvas: null,
    ctx: null,
    head: null,
    cursor: null,
    cursor_hotspot: null,
    cursor_canvas: null,
    min_distance: 1,
    erase: false,
    last_position: null,

    setup: function() {
      // create the canvas that will hold the brush to paint with
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      this.cursor_canvas = document.createElement('canvas');
    },

    load: function(conf) {
      this.head = conf.head;
      this.min_distance = Math.max(1, conf.min_distance || 1);
      this.cursor = conf.cursor.img;
      this.cursor_hotspot = conf.cursor.hotspot,
      this.erase = !!conf.erase;
      this.setupDrawingCanvas();
      this.setupCursor();
    },

    updateColor: function() {
      this.setupDrawingCanvas();

      if (!this.erase) {
        this.setupCursor();
      }
    },

    // Prepares a canvas with the current brush image, dyed to the current color
    setupDrawingCanvas: function() {
      // if there is no head image, then return
      if (!this.head) {
        return;
      }

      this.canvas.width = this.head.width;
      this.canvas.height = this.head.height;

      // copy the brush image on the tool canvas
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(this.head, 0, 0);

      // create a buffer canvas that will hold the color
      var buffer = document.createElement('canvas'),
          bctx = buffer.getContext('2d');
console.log("this head width"+this.head.width+","+this.head.height);
      buffer.width = this.head.width;
      buffer.height = this.head.height;
  //buffer.width = 126;
     // buffer.height = 378;

      // fill the buffer with the current color
      // eraser is drawing with white
      bctx.fillStyle = this.erase ? '#fff' : cdraw.current_color;
      bctx.fillRect(0, 0, this.head.width, this.head.height);
      // dye it to the current color
      this.ctx.globalCompositeOperation = 'source-atop';
      this.ctx.drawImage(buffer, 0, 0);
    },

    setupCursor: function() {
      // if a color was not picked yet, and this is not an eraser, the cursor cannot be build yet, so return
      if (!this.erase && !cdraw.current_color) {
        return;
      }

      // eraser does not need to be dyed
      if (this.erase) {
        cdraw.cursor.setCursor($(this.cursor).attr('src'), this.cursor_hotspot);
        return;
      }

      cdraw.dyeToolToColor(this.cursor_canvas, this.cursor, cdraw.current_color);
      cdraw.cursor.setCursor(this.cursor_canvas.toDataURL('image/png'), this.cursor_hotspot);
    },

    draw: function(position) {
      if (!this.head) {
        return;
      }

      var half_width = this.head.width / 2,
          half_height = this.head.height / 2;

      if (!this.last_position) {
        // on first draw, just paint the brush at the start location
        var x = Math.round(position.x - half_width),
            y = Math.round(position.y - half_height);
        cdraw.brush_canvas_ctx.drawImage(this.canvas, x, y);

        this.last_position = position;
      }
      else {
        // if this is not the first draw, then paint the brush multiple times along the line between the current and
        // the previous points
        var distance = distanceBetween(this.last_position, position),
            angle = angleBetween(this.last_position, position),
            x = null, y = null;

        // continue from the last point; the loop doesn't start at 0 as a brush was already painted at that position
        for (var i = this.min_distance; i < distance; i += this.min_distance) {
          var x = this.last_position.x + (Math.sin(angle) * i) - half_width,
              y = this.last_position.y + (Math.cos(angle) * i) - half_height;
          cdraw.brush_canvas_ctx.drawImage(this.canvas, x, y);
        }

        // if the loop was executed at least once, then x and y will now be numeric value
        // if that's the case, update the last drawing position
        if (typeof x === 'number') {
          this.last_position = {
            x: x + half_width,
            y: y + half_height
          };
        }
      }
    },

    stop: function() {
      this.last_position = null;
    }
  };


/* ==========================================================================
   Actions
   ========================================================================== */
  cdraw.actions = {};

/* ==========================================================================
   Setup the download functionality
   ========================================================================== */
  cdraw.actions.download = function() {
    var form = $('#drawing-tool-download-form'),
        img_input = $('#drawing-tool-download-input');

    form.attr('action', config.download_script_url);
    img_input.val(cdraw.getDrawingImageURI(true, true));

    form.submit();
  };

/* ==========================================================================
   Setup the print functionality
   ========================================================================== */
  cdraw.actions.print = function() {
    // get the window object of the print iframe
    var iframe = document.getElementById('drawing-tool-print-frame'),
        iwindow = null;

    if (iframe.contentWindow) {
      iwindow = iframe.contentWindow;
    }
    else if (iframe.contentDocument) {
      if (iframe.contentDocument.defaultView) {
        iwindow = iframe.contentDocument.defaultView;
      }
      else if (iframe.contentDocument.parentWindow) {
        iwindow = iframe.contentDocument.parentWindow;
      }
    }
    if (!iwindow) {
      return;
    }

    // call the printImage function, defined in the html of the print iframe
    iwindow.printImage(cdraw.getDrawingImageURI(true, true));
  };



/* ==========================================================================
   Popups (Confirmation & Done)
   ========================================================================== */
  cdraw.popups = {
    currently_opened_popup: null,

    setup: function() {
      // Remove the print button on portable deviced
      if (/iPhone|iPod|iPad|Android/i.test(navigator.userAgent)) {
        $('#drawing-tool-done-popup .button.print').remove();
      }

      // portable iOS devices don't allow downloading, so make the downloaded image open in a new tab
      if (/iPhone|iPod|iPad/i.test(navigator.userAgent)) {
        $('#drawing-tool-download-form').attr('target', '_blank');
      }

      // Listen for clicks on the Close button displayed to the right top
      // This button will either open the Confirmation popup or close the Done popup
      $('#drawing-tool-close-btn').click(function() {
        if (this.currently_opened_popup === 'done') {
          // the Done popup is opened => close it
          this.closeCurrentlyOpened();
        }
        else {
          // the Done popup is not opened => open the Exit Confirmation popup
          this.open('confirm-exit');
        }
      }.bind(this));

      // Open the Done popup when clicking the Done button displayed to the right bottom
      $('#drawing-tool-done-btn').click(this.open.bind(this, 'done'));

      // Open the Clear Canvas Confirmation popup when clicking the bucket button in the drawer
      $('#tool-bucket').click(function() {
        // don't do anything if the tool is disabled
        if ($('#tool-bucket').hasClass('disabled')) {
          return;
        }

        // temporary deactivate the current tool and activate the bucket
        $('#tools .tool.on').removeClass('on');
        $('#tool-bucket').addClass('on');

        this.open('confirm-clear');
      }.bind(this));


      // Close the current popup when clicking any Continue button
      $('.drawing-tool-confirm-popup .button.continue, #drawing-tool-done-popup .button.continue').click(this.closeCurrentlyOpened.bind(this));

      // Close popups when clicking outside of them (on the overlay)
      $('#drawing-tool-confirm-overlay').click(this.closeCurrentlyOpened.bind(this));

      $('#drawing-tool .drawing-tool-confirm-popup .button.clear-canvas').click(function() {
        // clear the canvas
        cdraw.clearCanvas();

        // disable the bucket
        $('#tool-bucket').addClass('disabled');

        this.closeCurrentlyOpened();
      }.bind(this));

      // Clinking the Print button prints the image and closes the popup
      $('#drawing-tool-done-popup .button.print').click(function() {
        cdraw.actions.print();
        this.closeCurrentlyOpened();
      }.bind(this));

 // Clinking the Save button downloads the image and closes the popup
 $("#drawing-tool-done-popup .actions a.button.save").click(function() {
this.closeCurrentlyOpened();
 }.bind(this));
 
 //var currentURL;
 $('#drawing-tool-done-btn').click(function(){
$('#drawing-tool-done-popup .button.save').replaceWith('<a class="button save"></a>');
$('#drawing-tool-done-popup .button.save').attr('href', cdraw.getDrawingImageURI());
$('#drawing-tool-done-popup .button.save').attr('download', cdraw.getDrawingImageURI());
//currentURL = window.location.href;
//$('#drawing-tool-done-popup .button.trash').attr("href",currentURL);
 }.bind(this));
 },

    open: function(popup_name) {
      // if another popup is already opened, then don't try opening this one again
      // can happen due to the transition for opening / closing a popup
      if (this.currently_opened_popup) {
        return;
      }
      this.currently_opened_popup = popup_name;

      switch (popup_name) {
        case 'confirm-exit': this._openConfirmationPopup('exit'); break;
        case 'confirm-clear': this._openConfirmationPopup('clear'); break;
        case 'done': this._openDonePopup(); break;
      }
    },

    closeCurrentlyOpened: function() {
      // if there's no popup opened, there's nothing else to do here
      if (!this.currently_opened_popup) {
        return;
      }

      switch (this.currently_opened_popup) {
        case 'confirm-exit': this._closeConfirmationPopup('exit'); break;
        case 'confirm-clear': this._closeConfirmationPopup('clear'); break;
        case 'done': this._closeDonePopup(); break;
      }
    },

    _openConfirmationPopup: function(scope) {
      // show the popup and the overlay
      $('#drawing-tool-confirm-' + scope + '-popup, #drawing-tool-confirm-overlay').css({
        display: 'block',
        opacity: 0
      });

      // fade in
      window.setTimeout(function(scope) {
        $('#drawing-tool-confirm-' + scope + '-popup, #drawing-tool-confirm-overlay').css('opacity', 1);
      }.bind(this, scope), 0);
    },

    _closeConfirmationPopup: function(scope) {
      // fade out the popup and the overlay
      $('#drawing-tool-confirm-' + scope + '-popup, #drawing-tool-confirm-overlay').css('opacity', 0);

      // when closing the Clear Canvas Cconfirmation popup we also need to restore the selected tool and to close the drawer
      if (scope === 'clear') {
        // restore the selected tool
        $('#tool-bucket').removeClass('on');
        $('#tool-' + cdraw.current_tool_name).addClass('on');

        // close the drawer
        cdraw.tools_drawer.close();
      }

      // once faded out, hide the popup and the overlay
      window.setTimeout(function(scope) {
        $('#drawing-tool-confirm-' + scope + '-popup, #drawing-tool-confirm-overlay').css('display', 'none');
        this.currently_opened_popup = null;
      }.bind(this, scope), 300);
    },

    _openDonePopup: function() {
      // set the preview image
      $('#drawing-tool-preview').attr('src', cdraw.getDrawingImageURI());

      // show the popup
      $('#drawing-tool-done-popup').css({
        display: 'block',
        opacity: 0
      });

      // fade in
      window.setTimeout(function() {
        $('#drawing-tool-done-popup').css('opacity', 1);
      }, 0);

      // all elements except the logo need to be hidden (through visibility, so that the elements will still have a size,
      // needed in case of a resize with the popup opened)
      // also set the opacity to 0, to prepare the elements for fade in on popup close
      $('#canvas-wrapper, #palette, #tools-wrapper, #drawing-tool-done-btn, #drawing-tool-close-btn').css({
        visibility: 'hidden',
        opacity: 0
      });
    },

    _closeDonePopup: function() {
      // hide the popup directly, with no animation
      $('#drawing-tool-done-popup').css({
        display: 'none',
        opacity: 0
      });
      this.currently_opened_popup = null;

      // all elements except the logo need to be faded in
      $('#canvas-wrapper, #palette, #tools-wrapper, #drawing-tool-done-btn, #drawing-tool-close-btn').css({
        visibility: 'visible',
        opacity: 1
      });
    },

    getOpenedPopup: function() {
      return this.currently_opened_popup;
    }
  };



/* ==========================================================================
   Initialize the drawing tool
   ========================================================================== */
  cdraw.initialize();

}());