// Global audio object, used to play sounds throughout the site
(function () {
  
  // create the global objects; methods will be exposed later
  window.audio = {};

  var sm_loaded = false,
      sm_sounds = {},
      playing_sounds = {},
      pending_load_sounds = [],
      global_loading_sounds = 0;

  // Initialize soundmanager
  soundManager.setup({
    url: 'Resources/js/vendor/soundmanager/swf/',
    flashVersion: 9,
    onready: function() {
      // load all sounds that were initialized before the soundmanager was ready
      sm_loaded = true;
      for (var i = 0; i < pending_load_sounds.length; i++) {
        audio.load(pending_load_sounds[i].sounds, pending_load_sounds[i].callback);
      }
    }
  });

  // Loads a set of sounds and calls callback once the sounds are loaded
  audio.load = function(sounds, callback) {
    // make sure the config provided is an object
    if (typeof sounds !== 'object') {
      return;
    }

    // if soundmanager is not ready yet, then just store the sounds and return (soundmanager will call this method again once loaded)
    if (!sm_loaded) {
      pending_load_sounds.push({sounds: sounds, callback: callback});
      return;
    }

    var local_loading_sounds = 0;

    // walk through each sound
    for (var id in sounds) {
      // if there is already a sound with this id, then destroy it
      if (sm_sounds[id] != null) {
        sm_sounds[id].destruct();
      }
      global_loading_sounds++;
      local_loading_sounds++;
      // create a soundmanager sound object
      sm_sounds[id] = soundManager.createSound({
        id: id,
        url: sounds[id],
        autoLoad: true,
        autoPlay: false,
        onload: function() {
          // When all the sounds configured so far are loaded, trigger an event
          if (--global_loading_sounds === 0) {
            $(window).trigger('sounds-loaded');
          }

          // When all the sounds in the current set are loaded, call the callback function
          if (--local_loading_sounds === 0 && typeof callback === 'function') {
            callback.call();
          }
        },
        onplay: function() {
          if(typeof this._onplayCallback == 'function')
            this._onplayCallback();
          // store a list of currently playing sounds
          playing_sounds[this.id] = true;
        },
        onfinish: function() {
          if(typeof this._onfinishCallback == 'function')
            this._onfinishCallback();
          // remove this sound from the list of currently playing sounds
          if (playing_sounds[this.id] != null) {
            delete playing_sounds[id];
          }
        },
        onstop: function() {
          if(typeof this._onfinishCallback == 'function')
            this._onfinishCallback();
        }
      });
    }
  };

  // Plays the sound idetified by id
  audio.play = function(id, loop) {
    // if soundmanager is not ready yet, or if the sound was not initialized, return
    if (!sm_loaded || sm_sounds[id] == null) {
      return;
    }

    // reset the sound, in case it is currently fading out
    sm_sounds[id]._fading_out = false;
    sm_sounds[id].setVolume(100);
    sm_sounds[id].stop();

    // play the sound
    sm_sounds[id].setVolume(100);
    var options = {from: 0};
    if (loop) {
      options.loops = 999999;
    }
    sm_sounds[id].play(options);
  };

  // Stops the sound idetified by id
  audio.stop = function(id, fade) {
    // make sure the sound is playing
    if (playing_sounds[id] == null) {
      return;
    }

    if (fade) {
      sm_sounds[id]._fading_out = true;
      requestAnimationFrame(audio._fadeOut.bind(audio._fadeOut, id));
      return;
    }

    // stop the sound
    sm_sounds[id].stop();

    // remove this sound from the list of currently playing sounds
    delete playing_sounds[id];

    return;
  };

  audio._fadeOut = function(id) {
    if (!sm_sounds[id]._fading_out) {
      return;
    }

    if (sm_sounds[id].volume === 0) {
      audio.stop(id);
      return;
    }

    sm_sounds[id].setVolume(Math.max(0, sm_sounds[id].volume - 5));

    requestAnimationFrame(audio._fadeOut.bind(audio._fadeOut, id));
  };

  // Stops playback for all sounds
  audio.stopAll = function() {
    // walk through the playing sounds
    for (var id in playing_sounds) {
      // stop the sound
      sm_sounds[id].stop();
    }
    // reinitialize the playing sounds object
    playing_sounds = {};
  };

  // Checks whether the sound idetified by id is currently playing
  audio.isPlaying = function(id) {
    return playing_sounds[id] != null;
  };

  // Destroys the sound idetified by id
  audio.destroy = function(id) {
    // make sure the sound was initialized
    if (sm_sounds[id] != null) {
      // destroy the sound
      sm_sounds[id].destruct();
    }
  };
  
}());
