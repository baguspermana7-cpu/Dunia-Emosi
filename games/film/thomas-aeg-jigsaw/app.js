var Utils;
(function (Utils) {
    var AssetLoader = (function () {
        function AssetLoader(_lang, _aFileData, _ctx, _canvasWidth, _canvasHeight, _showBar) {
            var _this = this;
            if (_showBar === void 0) { _showBar = true; }
            this.oAssetData = {};
            this.assetsLoaded = 0;
            this.textData = {};
            this.spinnerRot = 0;
            this.animComplete = false;
            this.totalAssets = _aFileData.length;
            this.showBar = _showBar;
            for (var i = 0; i < _aFileData.length; i++) {
                if (_aFileData[i].file.indexOf(".json") != -1) {
                    this.loadJSON(_aFileData[i]);
                }
                else {
                    this.loadImage(_aFileData[i]);
                }
            }
            if (this.showBar) {
                this.preloaderAnim = new Utils.AnimSprite(preAssetLib.getData("preloaderAnim"), 15, 20, "firstJump");
                this.preloaderAnim.setAnimType("once", "firstJump", false);
                this.preloaderAnim.animEndedFunc = function () {
                    _this.animComplete = true;
                    _this.checkLoadComplete();
                    _this.preloaderAnim.setAnimType("loop", "loopJump", false);
                };
            }
            else {
                this.animComplete = true;
            }
        }
        AssetLoader.prototype.render = function () {
            ctx.fillStyle = "#F6D638";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            var tempScale = Math.max(canvas.width, canvas.height) / 1200;
            var oImgData = preAssetLib.getData("preloadBg");
            ctx.drawImage(oImgData.img, 0, 0, oImgData.img.width, oImgData.img.height, canvas.width / 2 - (oImgData.img.width / 2) * tempScale, canvas.height / 2 - (oImgData.img.height / 2) * tempScale, oImgData.img.height * tempScale, oImgData.img.height * tempScale);
            var oSData = getSpriteData(preAssetLib.getData("preloaderElements"), "logo");
            ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, canvas.width / 2 - oSData.bWidth / 2 - 2, canvas.height / 2 - oSData.bHeight / 2 + 6, oSData.bWidth, oSData.bHeight);
            this.preloaderAnim.x = canvas.width / 2;
            this.preloaderAnim.y = canvas.height / 2 - 50;
            this.preloaderAnim.updateAnimation();
            this.preloaderAnim.render();
            oSData = getSpriteData(preAssetLib.getData("preloaderElements"), "bar0");
            ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, canvas.width / 2 - oSData.bWidth / 2, canvas.height / 2 - oSData.bHeight / 2 + 125, oSData.bWidth, oSData.bHeight);
            oSData = getSpriteData(preAssetLib.getData("preloaderElements"), "bar1");
            var tempPerc = Math.max(this.assetsLoaded / this.totalAssets, .00001);
            ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth * tempPerc, oSData.bHeight, canvas.width / 2 - oSData.bWidth / 2, canvas.height / 2 - oSData.bHeight / 2 + 125, oSData.bWidth * tempPerc, oSData.bHeight);
        };
        AssetLoader.prototype.displayNumbers = function () {
            ctx.textAlign = "left";
            ctx.font = "bold 40px arial";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(Math.round((this.assetsLoaded / this.totalAssets) * 100) + "%", canvas.width / 2 + 0, canvas.height / 2 - 1);
        };
        AssetLoader.prototype.loadExtraAssets = function (_callback, _aFileData) {
            this.showBar = false;
            this.totalAssets = _aFileData.length;
            this.assetsLoaded = 0;
            this.loadedCallback = _callback;
            for (var i = 0; i < _aFileData.length; i++) {
                if (_aFileData[i].file.indexOf(".json") != -1) {
                    this.loadJSON(_aFileData[i]);
                }
                else {
                    this.loadImage(_aFileData[i]);
                }
            }
        };
        AssetLoader.prototype.loadJSON = function (_oData) {
            var _this = this;
            var xobj = new XMLHttpRequest();
            xobj.open('GET', _oData.file, true);
            xobj.onreadystatechange = function () {
                if (xobj.readyState == 4 && xobj.status == 200) {
                    _this.textData[_oData.id] = JSON.parse(xobj.responseText);
                    ++_this.assetsLoaded;
                    _this.checkLoadComplete();
                }
            };
            xobj.send(null);
        };
        AssetLoader.prototype.loadImage = function (_oData) {
            var _this = this;
            var img = new Image();
            img.onload = function () {
                _this.oAssetData[_oData.id] = {};
                _this.oAssetData[_oData.id].img = img;
                _this.oAssetData[_oData.id].oData = {};
                var aSpriteSize = _this.getSpriteSize(_oData.file);
                if (aSpriteSize[0] != 0) {
                    _this.oAssetData[_oData.id].oData.spriteWidth = aSpriteSize[0];
                    _this.oAssetData[_oData.id].oData.spriteHeight = aSpriteSize[1];
                }
                else {
                    _this.oAssetData[_oData.id].oData.spriteWidth = _this.oAssetData[_oData.id].img.width;
                    _this.oAssetData[_oData.id].oData.spriteHeight = _this.oAssetData[_oData.id].img.height;
                }
                if (_oData.oAnims) {
                    _this.oAssetData[_oData.id].oData.oAnims = _oData.oAnims;
                }
                if (_oData.oAtlasData) {
                    _this.oAssetData[_oData.id].oData.oAtlasData = _oData.oAtlasData;
                }
                else {
                    _this.oAssetData[_oData.id].oData.oAtlasData = { none: { x: 0, y: 0, width: _this.oAssetData[_oData.id].oData.spriteWidth, height: _this.oAssetData[_oData.id].oData.spriteHeight } };
                }
                ++_this.assetsLoaded;
                _this.checkLoadComplete();
            };
            img.src = _oData.file;
        };
        AssetLoader.prototype.getSpriteSize = function (_file) {
            var aNew = new Array();
            var sizeY = "";
            var sizeX = "";
            var stage = 0;
            var inc = _file.lastIndexOf(".");
            var canCont = true;
            while (canCont) {
                inc--;
                if (stage == 0 && this.isNumber(_file.charAt(inc))) {
                    sizeY = _file.charAt(inc) + sizeY;
                }
                else if (stage == 0 && sizeY.length > 0 && _file.charAt(inc) == "x") {
                    inc--;
                    stage = 1;
                    sizeX = _file.charAt(inc) + sizeX;
                }
                else if (stage == 1 && this.isNumber(_file.charAt(inc))) {
                    sizeX = _file.charAt(inc) + sizeX;
                }
                else if (stage == 1 && sizeX.length > 0 && _file.charAt(inc) == "_") {
                    canCont = false;
                    aNew = [parseInt(sizeX), parseInt(sizeY)];
                }
                else {
                    canCont = false;
                    aNew = [0, 0];
                }
            }
            return aNew;
        };
        AssetLoader.prototype.isNumber = function (n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        };
        AssetLoader.prototype.checkLoadComplete = function () {
            if (this.assetsLoaded == this.totalAssets && this.animComplete) {
                this.loadedCallback();
            }
        };
        AssetLoader.prototype.onReady = function (_func) {
            this.loadedCallback = _func;
        };
        AssetLoader.prototype.getImg = function (_id) {
            return this.oAssetData[_id].img;
        };
        AssetLoader.prototype.getData = function (_id) {
            return this.oAssetData[_id];
        };
        return AssetLoader;
    }());
    Utils.AssetLoader = AssetLoader;
})(Utils || (Utils = {}));
var Utils;
(function (Utils) {
    var AnimSprite = (function () {
        function AnimSprite(_oImgData, _fps, _radius, _animId, _needsBuffer) {
            if (_needsBuffer === void 0) { _needsBuffer = true; }
            this.x = 0;
            this.y = 0;
            this.rotation = 0;
            this.radius = 10;
            this.removeMe = false;
            this.frameInc = 0;
            this.animType = "loop";
            this.offsetX = 0;
            this.offsetY = 0;
            this.scaleX = 1;
            this.scaleY = 1;
            this.alpha = 1;
            this.frameBuffer = 0;
            this.oImgData = _oImgData;
            this.oAnims = this.oImgData.oData.oAnims;
            this.fps = _fps;
            this.radius = _radius;
            this.animId = _animId;
            if (_needsBuffer) {
                this.frameBuffer = frameBuffer;
            }
            else {
                this.frameBuffer = 0;
            }
            this.centreX = Math.round(this.oImgData.oData.spriteWidth / 2);
            this.centreY = Math.round(this.oImgData.oData.spriteHeight / 2);
        }
        AnimSprite.prototype.updateAnimation = function () {
            this.frameInc += this.fps * delta;
        };
        AnimSprite.prototype.changeImgData = function (_newImgData, _animId) {
            this.oImgData = _newImgData;
            this.oAnims = this.oImgData.oData.oAnims;
            this.animId = _animId;
            this.centreX = Math.round(this.oImgData.oData.spriteWidth / 2);
            this.centreY = Math.round(this.oImgData.oData.spriteHeight / 2);
            this.resetAnim();
        };
        AnimSprite.prototype.resetAnim = function () {
            this.frameInc = 0;
        };
        AnimSprite.prototype.setFrame = function (_frameNum) {
            this.fixedFrame = _frameNum;
        };
        AnimSprite.prototype.setAnimType = function (_type, _animId, _reset) {
            if (_reset === void 0) { _reset = true; }
            this.animId = _animId;
            this.animType = _type;
            if (_reset) {
                this.resetAnim();
            }
            switch (_type) {
                case "loop":
                    break;
                case "once":
                    this.maxIdx = this.oAnims[this.animId].length - 1;
                    break;
            }
        };
        AnimSprite.prototype.render = function () {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.scale(this.scaleX, this.scaleY);
            ctx.globalAlpha = this.alpha;
            if (this.animId != null) {
                var max = this.oAnims[this.animId].length;
                var idx = Math.floor(this.frameInc);
                this.curFrame = this.oAnims[this.animId][idx % max];
                var imgX = (this.curFrame * this.oImgData.oData.spriteWidth) % this.oImgData.img.width;
                var imgY = Math.floor(this.curFrame / (this.oImgData.img.width / this.oImgData.oData.spriteWidth)) * this.oImgData.oData.spriteHeight;
                if (this.animType == "once") {
                    if (idx > this.maxIdx) {
                        this.fixedFrame = this.oAnims[this.animId][max - 1];
                        this.animId = null;
                        if (this.animEndedFunc != null) {
                            this.animEndedFunc();
                        }
                        var imgX = (this.fixedFrame * this.oImgData.oData.spriteWidth) % this.oImgData.img.width;
                        var imgY = Math.floor(this.fixedFrame / (this.oImgData.img.width / this.oImgData.oData.spriteWidth)) * this.oImgData.oData.spriteHeight;
                    }
                }
            }
            else {
                var imgX = (this.fixedFrame * this.oImgData.oData.spriteWidth) % this.oImgData.img.width;
                var imgY = Math.floor(this.fixedFrame / (this.oImgData.img.width / this.oImgData.oData.spriteWidth)) * this.oImgData.oData.spriteHeight;
            }
            ctx.drawImage(this.oImgData.img, imgX, imgY, this.oImgData.oData.spriteWidth, this.oImgData.oData.spriteHeight, -this.centreX + this.offsetX, -this.centreY + this.offsetY, this.oImgData.oData.spriteWidth, this.oImgData.oData.spriteHeight);
            ctx.restore();
        };
        AnimSprite.prototype.renderSimple = function () {
            if (this.animId != null) {
                var max = this.oAnims[this.animId].length;
                var idx = Math.floor(this.frameInc);
                this.curFrame = this.oAnims[this.animId][idx % max];
                var imgX = (this.curFrame * (this.oImgData.oData.spriteWidth + this.frameBuffer)) % this.oImgData.img.width;
                var imgY = Math.floor(this.curFrame / (this.oImgData.img.width / (this.oImgData.oData.spriteWidth + this.frameBuffer))) * (this.oImgData.oData.spriteHeight + frameBuffer);
                if (this.animType == "once") {
                    if (idx > this.maxIdx) {
                        this.fixedFrame = this.oAnims[this.animId][max - 1];
                        this.animId = null;
                        if (this.animEndedFunc != null) {
                            this.animEndedFunc();
                        }
                        var imgX = (this.fixedFrame * (this.oImgData.oData.spriteWidth + this.frameBuffer)) % this.oImgData.img.width;
                        var imgY = Math.floor(this.fixedFrame / (this.oImgData.img.width / (this.oImgData.oData.spriteWidth + this.frameBuffer))) * (this.oImgData.oData.spriteHeight + frameBuffer);
                    }
                }
            }
            else {
                var imgX = (this.fixedFrame * (this.oImgData.oData.spriteWidth + this.frameBuffer)) % this.oImgData.img.width;
                var imgY = Math.floor(this.fixedFrame / (this.oImgData.img.width / (this.oImgData.oData.spriteWidth + this.frameBuffer))) * (this.oImgData.oData.spriteHeight + frameBuffer);
            }
            ctx.drawImage(this.oImgData.img, imgX, imgY, this.oImgData.oData.spriteWidth, this.oImgData.oData.spriteHeight, this.x - (this.centreX - this.offsetX) * this.scaleX, this.y - (this.centreY - this.offsetY) * this.scaleY, this.oImgData.oData.spriteWidth * this.scaleX, this.oImgData.oData.spriteHeight * this.scaleY);
        };
        return AnimSprite;
    }());
    Utils.AnimSprite = AnimSprite;
})(Utils || (Utils = {}));
var Utils;
(function (Utils) {
    var BasicSprite = (function () {
        function BasicSprite(_oImgData, _radius, _frame) {
            if (_frame === void 0) { _frame = 0; }
            this.x = 0;
            this.y = 0;
            this.rotation = 0;
            this.radius = 10;
            this.removeMe = false;
            this.offsetX = 0;
            this.offsetY = 0;
            this.scaleX = 1;
            this.scaleY = 1;
            this.oImgData = _oImgData;
            this.radius = _radius;
            this.setFrame(_frame);
        }
        BasicSprite.prototype.setFrame = function (_frameNum) {
            this.frameNum = _frameNum;
        };
        BasicSprite.prototype.render = function (_ctx) {
            _ctx.save();
            _ctx.translate(this.x, this.y);
            _ctx.rotate(this.rotation);
            _ctx.scale(this.scaleX, this.scaleY);
            var imgX = (this.frameNum * this.oImgData.oData.spriteWidth) % this.oImgData.img.width;
            var imgY = Math.floor(this.frameNum / (this.oImgData.img.width / this.oImgData.oData.spriteWidth)) * this.oImgData.oData.spriteHeight;
            _ctx.drawImage(this.oImgData.img, imgX, imgY, this.oImgData.oData.spriteWidth, this.oImgData.oData.spriteHeight, -this.oImgData.oData.spriteWidth / 2 + this.offsetX, -this.oImgData.oData.spriteHeight / 2 + this.offsetY, this.oImgData.oData.spriteWidth, this.oImgData.oData.spriteHeight);
            _ctx.restore();
        };
        return BasicSprite;
    }());
    Utils.BasicSprite = BasicSprite;
})(Utils || (Utils = {}));
var Utils;
(function (Utils) {
    var UserInput = (function () {
        function UserInput(_canvas, _isBugBrowser) {
            var _this = this;
            this.prevHitTime = 0;
            this.pauseIsOn = false;
            this.isDown = false;
            this.isBugBrowser = _isBugBrowser;
            this.keyDownEvtFunc = function (e) {
                _this.keyDown(e);
            };
            this.keyUpEvtFunc = function (e) {
                _this.keyUp(e);
            };
            _canvas.addEventListener('contextmenu', function (event) { return event.preventDefault(); });
            _canvas.addEventListener("touchstart", function (e) {
                for (var i = 0; i < e.changedTouches.length; i++) {
                    _this.hitDown(e, e.changedTouches[i].pageX, e.changedTouches[i].pageY, e.changedTouches[i].identifier);
                }
            }, false);
            _canvas.addEventListener("touchend", function (e) {
                for (var i = 0; i < e.changedTouches.length; i++) {
                    _this.hitUp(e, e.changedTouches[i].pageX, e.changedTouches[i].pageY, e.changedTouches[i].identifier);
                }
            }, false);
            _canvas.addEventListener("touchcancel", function (e) {
                for (var i = 0; i < e.changedTouches.length; i++) {
                    _this.hitCancel(e, e.changedTouches[i].pageX, e.changedTouches[i].pageY, e.changedTouches[i].identifier);
                }
            }, false);
            _canvas.addEventListener("touchmove", function (e) {
                for (var i = 0; i < e.changedTouches.length; i++) {
                    _this.move(e, e.changedTouches[i].pageX, e.changedTouches[i].pageY, e.changedTouches[i].identifier, true);
                }
            }, false);
            _canvas.addEventListener("mousedown", function (e) {
                _this.isDown = true;
                _this.hitDown(e, e.pageX, e.pageY, 1);
            }, false);
            _canvas.addEventListener("mouseup", function (e) {
                _this.isDown = false;
                _this.hitUp(e, e.pageX, e.pageY, 1);
            }, false);
            _canvas.addEventListener("mousemove", function (e) {
                _this.move(e, e.pageX, e.pageY, 1, _this.isDown);
            }, false);
            _canvas.addEventListener("mouseout", function (e) {
                if (e.button == 2) {
                    return;
                }
                clearButtonOvers();
                _this.isDown = false;
                _this.hitCancel(e, Math.abs(e.pageX), Math.abs(e.pageY), 1);
            }, false);
            this.aHitAreas = new Array();
            this.aKeys = new Array();
        }
        UserInput.prototype.hitDown = function (e, _posX, _posY, _identifer) {
            e.preventDefault();
            e.stopPropagation();
            if (!hasFocus) {
                visibleResume();
            }
            if (this.pauseIsOn) {
                return;
            }
            if (jigsaw != undefined && jigsaw.oDragData.dragState == 1) {
                return;
            }
            var curHitTime = new Date().getTime();
            _posX *= canvasScale;
            _posY *= canvasScale;
            for (var i = 0; i < this.aHitAreas.length; i++) {
                if (this.aHitAreas[i].rect) {
                    var aX = canvas.width * this.aHitAreas[i].align[0];
                    var aY = canvas.height * this.aHitAreas[i].align[1];
                    if (_posX > aX + this.aHitAreas[i].area[0] && _posY > aY + this.aHitAreas[i].area[1] && _posX < aX + this.aHitAreas[i].area[2] && _posY < aY + this.aHitAreas[i].area[3]) {
                        this.aHitAreas[i].aTouchIdentifiers.push(_identifer);
                        this.aHitAreas[i].oData.hasLeft = false;
                        if (!this.aHitAreas[i].oData.isDown) {
                            this.aHitAreas[i].oData.isDown = true;
                            this.aHitAreas[i].oData.x = _posX;
                            this.aHitAreas[i].oData.y = _posY;
                            if ((curHitTime - this.prevHitTime < 500 && (gameState != "game" || this.aHitAreas[i].id == "pause")) && isBugBrowser) {
                                return;
                            }
                            this.aHitAreas[i].callback(this.aHitAreas[i].id, this.aHitAreas[i].oData);
                        }
                        break;
                    }
                }
                else {
                }
            }
            this.prevHitTime = curHitTime;
        };
        UserInput.prototype.hitUp = function (e, _posX, _posY, _identifer) {
            if (!ios9FirstTouch) {
                playSound("silence");
                ios9FirstTouch = true;
            }
            if (this.pauseIsOn) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            _posX *= canvasScale;
            _posY *= canvasScale;
            for (var i = 0; i < this.aHitAreas.length; i++) {
                if (this.aHitAreas[i].rect) {
                    var aX = canvas.width * this.aHitAreas[i].align[0];
                    var aY = canvas.height * this.aHitAreas[i].align[1];
                    if (_posX > aX + this.aHitAreas[i].area[0] && _posY > aY + this.aHitAreas[i].area[1] && _posX < aX + this.aHitAreas[i].area[2] && _posY < aY + this.aHitAreas[i].area[3]) {
                        for (var j = 0; j < this.aHitAreas[i].aTouchIdentifiers.length; j++) {
                            if (this.aHitAreas[i].aTouchIdentifiers[j] == _identifer) {
                                this.aHitAreas[i].aTouchIdentifiers.splice(j, 1);
                                j -= 1;
                            }
                        }
                        if (this.aHitAreas[i].aTouchIdentifiers.length == 0) {
                            this.aHitAreas[i].oData.isDown = false;
                            if (this.aHitAreas[i].oData.multiTouch) {
                                this.aHitAreas[i].oData.x = _posX;
                                this.aHitAreas[i].oData.y = _posY;
                                this.aHitAreas[i].callback(this.aHitAreas[i].id, this.aHitAreas[i].oData);
                            }
                        }
                        break;
                    }
                }
                else {
                }
            }
        };
        UserInput.prototype.hitCancel = function (e, _posX, _posY, _identifer) {
            e.preventDefault();
            e.stopPropagation();
            _posX *= canvasScale;
            _posY *= canvasScale;
            for (var i = 0; i < this.aHitAreas.length; i++) {
                if (this.aHitAreas[i].oData.isDown) {
                    this.aHitAreas[i].oData.isDown = false;
                    this.aHitAreas[i].aTouchIdentifiers = new Array();
                    if (this.aHitAreas[i].oData.multiTouch) {
                        this.aHitAreas[i].oData.x = _posX;
                        this.aHitAreas[i].oData.y = _posY;
                        this.aHitAreas[i].callback(this.aHitAreas[i].id, this.aHitAreas[i].oData);
                    }
                }
            }
        };
        UserInput.prototype.move = function (e, _posX, _posY, _identifer, _isDown) {
            if (this.pauseIsOn) {
                return;
            }
            _posX *= canvasScale;
            _posY *= canvasScale;
            this.mouseX = _posX;
            this.mouseY = _posY;
            if (_isDown) {
                for (var i = 0; i < this.aHitAreas.length; i++) {
                    if (this.aHitAreas[i].rect) {
                        var aX = canvas.width * this.aHitAreas[i].align[0];
                        var aY = canvas.height * this.aHitAreas[i].align[1];
                        if (_posX > aX + this.aHitAreas[i].area[0] && _posY > aY + this.aHitAreas[i].area[1] && _posX < aX + this.aHitAreas[i].area[2] && _posY < aY + this.aHitAreas[i].area[3]) {
                            this.aHitAreas[i].oData.hasLeft = false;
                            if (this.aHitAreas[i].oData.isDraggable && !this.aHitAreas[i].oData.isDown) {
                                this.aHitAreas[i].oData.isDown = true;
                                this.aHitAreas[i].oData.isBeingDragged = true;
                                this.aHitAreas[i].oData.x = _posX;
                                this.aHitAreas[i].oData.y = _posY;
                                this.aHitAreas[i].aTouchIdentifiers.push(_identifer);
                                if (this.aHitAreas[i].oData.multiTouch) {
                                    this.aHitAreas[i].callback(this.aHitAreas[i].id, this.aHitAreas[i].oData);
                                }
                            }
                            if (this.aHitAreas[i].oData.isDraggable) {
                                this.aHitAreas[i].oData.isBeingDragged = true;
                                this.aHitAreas[i].oData.x = _posX;
                                this.aHitAreas[i].oData.y = _posY;
                                this.aHitAreas[i].callback(this.aHitAreas[i].id, this.aHitAreas[i].oData);
                                if (this.aHitAreas[i]) {
                                    this.aHitAreas[i].oData.isBeingDragged = false;
                                }
                            }
                        }
                        else if (this.aHitAreas[i].oData.isDown && !this.aHitAreas[i].oData.hasLeft) {
                            for (var j = 0; j < this.aHitAreas[i].aTouchIdentifiers.length; j++) {
                                if (this.aHitAreas[i].aTouchIdentifiers[j] == _identifer) {
                                    this.aHitAreas[i].aTouchIdentifiers.splice(j, 1);
                                    j -= 1;
                                }
                            }
                            if (this.aHitAreas[i].aTouchIdentifiers.length == 0) {
                                this.aHitAreas[i].oData.hasLeft = true;
                                if (!this.aHitAreas[i].oData.isBeingDragged) {
                                    this.aHitAreas[i].oData.isDown = false;
                                }
                                if (this.aHitAreas[i].oData.multiTouch) {
                                    this.aHitAreas[i].callback(this.aHitAreas[i].id, this.aHitAreas[i].oData);
                                }
                            }
                        }
                    }
                }
            }
        };
        UserInput.prototype.keyDown = function (e) {
            for (var i = 0; i < this.aKeys.length; i++) {
                if (e.keyCode == this.aKeys[i].keyCode) {
                    e.preventDefault();
                    this.aKeys[i].oData.isDown = true;
                    this.aKeys[i].callback(this.aKeys[i].id, this.aKeys[i].oData);
                }
            }
        };
        UserInput.prototype.keyUp = function (e) {
            for (var i = 0; i < this.aKeys.length; i++) {
                if (e.keyCode == this.aKeys[i].keyCode) {
                    e.preventDefault();
                    this.aKeys[i].oData.isDown = false;
                    this.aKeys[i].callback(this.aKeys[i].id, this.aKeys[i].oData);
                }
            }
        };
        UserInput.prototype.checkKeyFocus = function () {
            window.focus();
            if (this.aKeys.length > 0) {
                window.removeEventListener('keydown', this.keyDownEvtFunc, false);
                window.removeEventListener('keyup', this.keyUpEvtFunc, false);
                window.addEventListener('keydown', this.keyDownEvtFunc, false);
                window.addEventListener('keyup', this.keyUpEvtFunc, false);
            }
        };
        UserInput.prototype.addKey = function (_id, _callback, _oCallbackData, _keyCode) {
            if (_oCallbackData == null) {
                _oCallbackData = new Object();
            }
            this.aKeys.push({ id: _id, callback: _callback, oData: _oCallbackData, keyCode: _keyCode });
            this.checkKeyFocus();
        };
        UserInput.prototype.removeKey = function (_id) {
            for (var i = 0; i < this.aKeys.length; i++) {
                if (this.aKeys[i].id == _id) {
                    this.aKeys.splice(i, 1);
                    i -= 1;
                }
            }
        };
        UserInput.prototype.addHitArea = function (_id, _callback, _oCallbackData, _type, _oAreaData, _isUnique) {
            if (_isUnique === void 0) { _isUnique = false; }
            if (_oCallbackData == null) {
                _oCallbackData = new Object();
            }
            if (_isUnique) {
                this.removeHitArea(_id);
            }
            if (!_oAreaData.scale) {
                _oAreaData.scale = 1;
            }
            if (!_oAreaData.align) {
                _oAreaData.align = [0, 0];
            }
            var aTouchIdentifiers = new Array();
            switch (_type) {
                case "image":
                    var aRect;
                    aRect = new Array(_oAreaData.aPos[0] - (_oAreaData.oImgData.oData.oAtlasData[_oAreaData.id].width / 2) * _oAreaData.scale, _oAreaData.aPos[1] - (_oAreaData.oImgData.oData.oAtlasData[_oAreaData.id].height / 2) * _oAreaData.scale, _oAreaData.aPos[0] + (_oAreaData.oImgData.oData.oAtlasData[_oAreaData.id].width / 2) * _oAreaData.scale, _oAreaData.aPos[1] + (_oAreaData.oImgData.oData.oAtlasData[_oAreaData.id].height / 2) * _oAreaData.scale);
                    this.aHitAreas.push({ id: _id, aTouchIdentifiers: aTouchIdentifiers, callback: _callback, oData: _oCallbackData, rect: true, area: aRect, align: _oAreaData.align });
                    break;
                case "rect":
                    this.aHitAreas.push({ id: _id, aTouchIdentifiers: aTouchIdentifiers, callback: _callback, oData: _oCallbackData, rect: true, area: _oAreaData.aRect, align: _oAreaData.align });
                    break;
            }
        };
        UserInput.prototype.removeHitArea = function (_id) {
            for (var i = 0; i < this.aHitAreas.length; i++) {
                if (this.aHitAreas[i].id == _id) {
                    this.aHitAreas.splice(i, 1);
                    i -= 1;
                }
            }
        };
        UserInput.prototype.resetAll = function () {
            for (var i = 0; i < this.aHitAreas.length; i++) {
                this.aHitAreas[i].oData.isDown = false;
                this.aHitAreas[i].oData.isBeingDragged = false;
                this.aHitAreas[i].aTouchIdentifiers = new Array();
            }
            this.isDown = false;
        };
        return UserInput;
    }());
    Utils.UserInput = UserInput;
})(Utils || (Utils = {}));
var Utils;
(function (Utils) {
    var FpsMeter = (function () {
        function FpsMeter(_canvasHeight) {
            this.updateFreq = 10;
            this.updateInc = 0;
            this.frameAverage = 0;
            this.display = 1;
            this.log = "";
            this.render = function (_ctx) {
                this.frameAverage += this.delta / this.updateFreq;
                if (++this.updateInc >= this.updateFreq) {
                    this.updateInc = 0;
                    this.display = this.frameAverage;
                    this.frameAverage = 0;
                }
                _ctx.textAlign = "left";
                ctx.font = "10px Helvetica";
                _ctx.fillStyle = "#333333";
                _ctx.beginPath();
                _ctx.rect(0, this.canvasHeight - 15, 40, 15);
                _ctx.closePath();
                _ctx.fill();
                _ctx.fillStyle = "#ffffff";
                _ctx.fillText(Math.round(1000 / (this.display * 1000)) + " fps " + this.log, 5, this.canvasHeight - 5);
            };
            this.canvasHeight = _canvasHeight;
        }
        FpsMeter.prototype.update = function (_delta) {
            this.delta = _delta;
        };
        return FpsMeter;
    }());
    Utils.FpsMeter = FpsMeter;
})(Utils || (Utils = {}));
var Elements;
(function (Elements) {
    var Background = (function () {
        function Background() {
            this.x = 0;
            this.y = 0;
            this.targY = 0;
            this.inc = 0;
            this.incY1 = 0;
            this.offsetY = 0;
            this.renderState = null;
            if (gameState == "game") {
                this.oImgData = assetLib.getData("bg0");
                this.col = "#F6D638";
            }
            else {
                this.oImgData = assetLib.getData("bg1");
                this.col = "#0066FF";
            }
        }
        Background.prototype.render = function () {
            this.inc += delta;
            ctx.fillStyle = this.col;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            var tempScale = Math.max(canvas.width, canvas.height) / 1200;
            ctx.drawImage(this.oImgData.img, 0, 0, this.oImgData.img.width, this.oImgData.img.height, canvas.width / 2 - (this.oImgData.img.width / 2) * tempScale + Math.sin(this.inc * .15) * 100, canvas.height / 2 - (this.oImgData.img.height / 2) * tempScale + Math.sin(this.inc * .2) * 100, this.oImgData.img.height * tempScale, this.oImgData.img.height * tempScale);
        };
        return Background;
    }());
    Elements.Background = Background;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var Panel = (function () {
        function Panel(_panelType, _aButs) {
            this.timer = .3;
            this.endTime = 0;
            this.posY = 0;
            this.numberSpace = 17;
            this.incY = 0;
            this.flareRot = 0;
            this.particleInc = 0;
            this.oSplashLogoImgData = assetLib.getData("splashLogo");
            this.oUiElementsImgData = assetLib.getData("uiElements");
            this.panelType = _panelType;
            this.aButs = _aButs;
            this.oTopFlareImgData = assetLib.getData("flare");
            this.oFrameData = { x: 0, y: 0, scale: 0, buffer: 50, topGap: 70, pxSize: 800 };
        }
        Panel.prototype.update = function () {
            this.incY += 10 * delta;
        };
        Panel.prototype.startTween1 = function () {
            this.posY = 500;
            TweenLite.to(this, .5, { posY: 0, ease: "Back.easeOut" });
            this.posCurtain = 500;
            TweenLite.to(this, .5, { posCurtain: 0, ease: "Cubic.easeOut" });
            this.butsY = 500;
            TweenLite.to(this, .5, { butsY: 0, ease: "Cubic.easeOut" });
        };
        Panel.prototype.jigsawComplete = function () {
            var _this = this;
            playSound("completeSwoosh");
            var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
            if (canvas.width > canvas.height) {
                this.posX = this.oFrameData.x - canvas.width / 2;
                this.posY = this.oFrameData.y - canvas.height / 2;
                this.posScale = this.oFrameData.scale - (Math.min((canvas.height - (this.oFrameData.buffer * 2 + this.oFrameData.topGap)) / oSData.bHeight, (canvas.width - this.oFrameData.buffer * 2) / oSData.bWidth));
                TweenLite.to(this, 1, {
                    posX: 0, posY: 0, posScale: 0, posCurtain: canvas.width, ease: "Back.easeInOut",
                    onComplete: function () {
                        if (gameState == "game" && jigsawState == 2) {
                            _this.particleBlast();
                        }
                    }
                });
            }
            else {
                this.posX = this.oFrameData.x - canvas.width / 2;
                this.posY = this.oFrameData.y - canvas.height / 2;
                this.posScale = this.oFrameData.scale - (Math.min((canvas.width - (this.oFrameData.buffer * 2)) / oSData.bWidth, (canvas.height - (this.oFrameData.buffer * 2 + this.oFrameData.topGap)) / oSData.bHeight));
                TweenLite.to(this, 1, {
                    posX: 0, posY: 0, posScale: 0, posCurtain: canvas.height, ease: "Back.easeInOut",
                    onComplete: function () {
                        if (gameState == "game" && jigsawState == 2) {
                            _this.particleBlast();
                        }
                    }
                });
            }
            this.completeTimeOut = setTimeout(function () {
                if (gameState == "game" && jigsawState == 2) {
                    playSound("cheers" + Math.floor(Math.random() * 3));
                    TweenLite.to(_this, .5, {
                        posScale: -1, ease: "Back.easeIn",
                        onComplete: function () {
                            if (gameState == "game" && jigsawState == 2) {
                                for (var j = 0; j < 10; j++) {
                                    var tempParticle = new Elements.Particle(canvas.width / 2, canvas.height / 2, (360 / 10) * j - 90, 100);
                                    aParticles.push(tempParticle);
                                }
                                nextJigsaw();
                            }
                        }
                    });
                }
            }, 2500);
        };
        Panel.prototype.particleBlast = function () {
            playSound("complete");
            for (var j = 0; j < 20; j++) {
                var tempParticle = new Elements.Particle(canvas.width / 2, canvas.height / 2, (360 / 20) * j - 90, this.oFrameData.scale * 400, j * .04);
                aParticles.push(tempParticle);
                var tempParticle = new Elements.Particle(canvas.width / 2, canvas.height / 2, (360 / 20) * j + 90, this.oFrameData.scale * 300, j * .04);
                aParticles.push(tempParticle);
            }
        };
        Panel.prototype.switchBut = function (_id0, _id1, _id1Over, _aNewAPos, _aNewAlign) {
            if (_aNewAPos === void 0) { _aNewAPos = null; }
            if (_aNewAlign === void 0) { _aNewAlign = null; }
            var oButData = null;
            for (var i = 0; i < this.aButs.length; i++) {
                if (this.aButs[i].id == _id0) {
                    this.aButs[i].id = _id1;
                    this.aButs[i].idOver = _id1Over;
                    oButData = this.aButs[i];
                    if (_aNewAPos) {
                        this.aButs[i].aPos = _aNewAPos;
                    }
                    if (_aNewAlign) {
                        this.aButs[i].align = _aNewAlign;
                    }
                }
            }
            return oButData;
        };
        Panel.prototype.clipJigsaw = function () {
            var tempWidth = jigsaw.puzzleImg.img.width / 2;
            var tempHeight = jigsaw.puzzleImg.img.height / 2;
            var tempCurveGap = (jigsaw.curveRate * tempWidth) * 2;
            ctx.beginPath();
            ctx.moveTo(-tempWidth + tempCurveGap, -tempHeight);
            ctx.lineTo(tempWidth - tempCurveGap, -tempHeight);
            ctx.quadraticCurveTo(tempWidth, -tempHeight, tempWidth, -tempHeight + tempCurveGap);
            ctx.lineTo(tempWidth, tempHeight - tempCurveGap);
            ctx.quadraticCurveTo(tempWidth, tempHeight, tempWidth - tempCurveGap, tempHeight);
            ctx.lineTo(-tempWidth + tempCurveGap, tempHeight);
            ctx.quadraticCurveTo(-tempWidth, tempHeight, -tempWidth, tempHeight - tempCurveGap);
            ctx.lineTo(-tempWidth, -tempHeight + tempCurveGap);
            ctx.quadraticCurveTo(-tempWidth, -tempHeight, -tempWidth + tempCurveGap, -tempHeight);
            ctx.closePath();
            ctx.clip();
        };
        Panel.prototype.render = function (_butsOnTop) {
            if (_butsOnTop === void 0) { _butsOnTop = true; }
            if (!_butsOnTop) {
                this.addButs(ctx);
            }
            switch (this.panelType) {
                case "splash":
                    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(this.oSplashLogoImgData.img, canvas.width / 2 - this.oSplashLogoImgData.img.width / 2, canvas.height / 2 - this.oSplashLogoImgData.img.height / 2 - this.posY);
                    break;
                case "start":
                    var tempScale = Math.max(canvas.width, canvas.height) / 900;
                    var oSData = getSpriteData(assetLib.getData("uiElements"), "curtain");
                    ctx.save();
                    ctx.translate(canvas.width, canvas.height * .8 + Math.sin(this.incY) * 10 + this.posY / 2);
                    ctx.rotate(90 * radian);
                    ctx.scale(tempScale, tempScale);
                    ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, 0, 0, oSData.bWidth, oSData.bHeight);
                    ctx.restore();
                    tempScale = 1;
                    var oImageData = assetLib.getData("showLogo");
                    ctx.drawImage(oImageData.img, 0, 0, oImageData.img.width, oImageData.img.height, canvas.width / 2 - (oImageData.img.width / 2) * tempScale, canvas.height * .25 - (oImageData.img.height / 2) * tempScale + Math.sin(this.incY * .25) * 10 - this.posY, oImageData.img.width * tempScale, oImageData.img.height * tempScale);
                    var oImageData = assetLib.getData("titleLogo");
                    ctx.drawImage(oImageData.img, 0, 0, oImageData.img.width, oImageData.img.height, canvas.width / 2 - (oImageData.img.width / 2) * tempScale, canvas.height * .25 - (oImageData.img.height / 2) * tempScale + 250 * tempScale - this.posY * 1.5, oImageData.img.width * tempScale, oImageData.img.height * tempScale);
                    this.particleInc += delta;
                    if (this.particleInc > .5) {
                        this.particleInc = 0;
                        for (var j = 0; j < 6; j++) {
                            var tempParticle = new Elements.Particle(canvas.width / 2, canvas.height * .8, (180 / 5) * j + 180, 100, Math.random() * .5);
                            aParticles.push(tempParticle);
                        }
                    }
                    break;
                case "credits":
                    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(this.oSplashLogoImgData.img, canvas.width / 2 - this.oSplashLogoImgData.img.width / 2, canvas.height / 2 - this.oSplashLogoImgData.img.height / 2 - this.posY);
                    addText(0, 31, 1000, "center", canvas.width / 2, canvas.height / 2 - 230 - this.posY, "producedFor", "#FFFFFF");
                    addText(0, 31, 1000, "center", canvas.width / 2, canvas.height / 2 - 6 - this.posY, "createdBy", "#FFFFFF");
                    break;
                case "gameOver":
                    break;
                case "game":
                    if (canvas.width > canvas.height) {
                        var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
                        if (jigsawState == 2) {
                            this.oFrameData.x = canvas.width / 2 + this.posX;
                            this.oFrameData.y = canvas.height / 2 + this.posY;
                            this.oFrameData.scale = (Math.min((canvas.height - (this.oFrameData.buffer * 2 + this.oFrameData.topGap)) / oSData.bHeight, (canvas.width - this.oFrameData.buffer * 2) / oSData.bWidth)) + this.posScale;
                        }
                        else {
                            this.oFrameData.x = this.oFrameData.buffer + (canvas.width / 2 - this.oFrameData.buffer * .5) / 2 - this.posY;
                            this.oFrameData.y = (canvas.height - this.oFrameData.topGap) / 2 + this.oFrameData.topGap;
                            this.oFrameData.scale = Math.min((canvas.height - (this.oFrameData.buffer * 2 + this.oFrameData.topGap)) / oSData.bHeight, (canvas.width / 2 - this.oFrameData.buffer * 1.5) / oSData.bWidth);
                        }
                        ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, this.oFrameData.x - (oSData.bWidth / 2) * this.oFrameData.scale, this.oFrameData.y - (oSData.bHeight / 2) * this.oFrameData.scale, oSData.bWidth * this.oFrameData.scale, oSData.bHeight * this.oFrameData.scale);
                        ctx.fillStyle = "#ED1B98";
                        ctx.fillRect(canvas.width / 2 + 200 + this.posCurtain, 0, canvas.width, canvas.height);
                        var oSData = getSpriteData(assetLib.getData("uiElements"), "curtain");
                        var tempScale = 1;
                        ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, canvas.width / 2 + this.oFrameData.buffer / 2 + this.posCurtain, 0, oSData.bWidth * tempScale, oSData.bHeight * tempScale);
                    }
                    else {
                        var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
                        if (jigsawState == 2) {
                            this.oFrameData.x = canvas.width / 2 + this.posX;
                            this.oFrameData.y = canvas.height / 2 + this.posY;
                            this.oFrameData.scale = (Math.min((canvas.width - (this.oFrameData.buffer * 2)) / oSData.bWidth, (canvas.height - (this.oFrameData.buffer * 2 + this.oFrameData.topGap)) / oSData.bHeight)) + this.posScale;
                        }
                        else {
                            this.oFrameData.scale = Math.min((canvas.width - (this.oFrameData.buffer * 2)) / oSData.bWidth, (canvas.height / 2 - (this.oFrameData.buffer * 1 + this.oFrameData.topGap)) / oSData.bHeight);
                            this.oFrameData.x = canvas.width / 2;
                            this.oFrameData.y = this.oFrameData.topGap + this.oFrameData.buffer * 1 + (canvas.height / 2 - (this.oFrameData.topGap + this.oFrameData.buffer * 1)) / 2 - this.posY;
                        }
                        ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, this.oFrameData.x - (oSData.bWidth / 2) * this.oFrameData.scale, this.oFrameData.y - (oSData.bHeight / 2) * this.oFrameData.scale, oSData.bWidth * this.oFrameData.scale, oSData.bHeight * this.oFrameData.scale);
                        ctx.fillStyle = "#ED1B98";
                        ctx.fillRect(0, canvas.height / 2 + 200 + this.posCurtain, canvas.width, canvas.height + 1);
                        var oSData = getSpriteData(assetLib.getData("uiElements"), "curtain");
                        var tempScale = 1;
                        ctx.save();
                        ctx.translate(canvas.width, canvas.height / 2 + this.oFrameData.buffer / 2 + this.posCurtain);
                        ctx.rotate(90 * radian);
                        ctx.scale(tempScale, tempScale);
                        ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, 0, 0, oSData.bWidth, oSData.bHeight);
                        ctx.restore();
                    }
                    if (jigsawState == 2) {
                        ctx.save();
                        ctx.translate(canvas.width / 2 + this.posX, canvas.height / 2 + this.posY);
                        ctx.scale(this.oFrameData.scale * .83, this.oFrameData.scale * .83);
                        this.clipJigsaw();
                        ctx.drawImage(jigsaw.puzzleImg.img, 0, 0, jigsaw.puzzleImg.img.width, jigsaw.puzzleImg.img.height, -jigsaw.puzzleImg.img.width / 2, -jigsaw.puzzleImg.img.height / 2, jigsaw.puzzleImg.img.width, jigsaw.puzzleImg.img.height);
                        ctx.restore();
                    }
                    break;
                case "pause":
                    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    break;
            }
            if (_butsOnTop) {
                this.addButs(ctx);
            }
        };
        Panel.prototype.addButs = function (ctx) {
            var aButOver = false;
            for (var i = 0; i < this.aButs.length; i++) {
                if (this.aButs[i].isOver) {
                    aButOver = true;
                    break;
                }
            }
            for (var i = 0; i < this.aButs.length; i++) {
                var offsetPosY;
                var floatY = 0;
                if (this.incY != 0 && this.aButs[i].flash) {
                    if (this.aButs[i].isOver) {
                        floatY = Math.sin((this.incY + i * 2.5) * 2) * 3;
                    }
                    else {
                        floatY = Math.sin(this.incY + i * 2.5) * 3;
                    }
                }
                if (i % 2 == 0) {
                }
                if (!this.aButs[i].scale) {
                    this.aButs[i].scale = 1;
                }
                var bX;
                var bY;
                var bWidth;
                var bHeight;
                bX = this.aButs[i].oImgData.oData.oAtlasData[this.aButs[i].id].x;
                bY = this.aButs[i].oImgData.oData.oAtlasData[this.aButs[i].id].y;
                bWidth = this.aButs[i].oImgData.oData.oAtlasData[this.aButs[i].id].width;
                bHeight = this.aButs[i].oImgData.oData.oAtlasData[this.aButs[i].id].height;
                var aX = (canvas.width * this.aButs[i].align[0]);
                var aY = (canvas.height * this.aButs[i].align[1]);
                if (aY + this.aButs[i].aPos[1] > canvas.height / 2) {
                    offsetPosY = this.butsY;
                }
                else {
                    offsetPosY = -this.butsY;
                }
                this.aButs[i].aOverData = new Array(aX + this.aButs[i].aPos[0] - (bWidth / 2) * (this.aButs[i].scale) - floatY / 2, aY + this.aButs[i].aPos[1] - (bHeight / 2) * (this.aButs[i].scale) + offsetPosY + floatY / 2, aX + this.aButs[i].aPos[0] + (bWidth / 2) * (this.aButs[i].scale) - floatY / 2, aY + this.aButs[i].aPos[1] + (bHeight / 2) * (this.aButs[i].scale) + offsetPosY + floatY / 2);
                if (this.aButs[i].isOver && this.aButs[i].flash) {
                }
                ctx.drawImage(this.aButs[i].oImgData.img, bX, bY, bWidth, bHeight, this.aButs[i].aOverData[0], this.aButs[i].aOverData[1], bWidth * (this.aButs[i].scale) + floatY, bHeight * (this.aButs[i].scale) - floatY);
                if (this.aButs[i].isOver || this.aButs[i].flash) {
                    ctx.save();
                    if (this.aButs[i].isOver) {
                        ctx.globalAlpha = 1;
                    }
                    else {
                        if (aButOver) {
                            ctx.globalAlpha = Math.max(Math.sin(this.incY / 2), 0) / 2;
                        }
                        else {
                            ctx.globalAlpha = Math.max(Math.sin(this.incY / 2), 0);
                        }
                    }
                    bX = this.aButs[i].oImgData.oData.oAtlasData[this.aButs[i].idOver].x;
                    bY = this.aButs[i].oImgData.oData.oAtlasData[this.aButs[i].idOver].y;
                    bWidth = this.aButs[i].oImgData.oData.oAtlasData[this.aButs[i].idOver].width;
                    bHeight = this.aButs[i].oImgData.oData.oAtlasData[this.aButs[i].idOver].height;
                    ctx.drawImage(this.aButs[i].oImgData.img, bX, bY, bWidth, bHeight, this.aButs[i].aOverData[0], this.aButs[i].aOverData[1], bWidth * (this.aButs[i].scale) + floatY, bHeight * (this.aButs[i].scale) - floatY);
                    ctx.restore();
                }
            }
        };
        return Panel;
    }());
    Elements.Panel = Panel;
})(Elements || (Elements = {}));
var Utils;
(function (Utils) {
    var TextDisplay = (function () {
        function TextDisplay() {
            this.oTextData = {};
            this.inc = 0;
            this.createTextObjects();
        }
        TextDisplay.prototype.createTextObjects = function () {
            var cnt = 0;
            for (var i in assetLib.textData.langText.text[curLang]) {
                this.oTextData[i] = {};
                this.oTextData[i].aLineData = this.getCharData(assetLib.textData.langText.text[curLang][i]["@text"], assetLib.textData.langText.text[curLang][i]["@fontId"]);
                this.oTextData[i].aLineWidths = this.getLineWidths(this.oTextData[i].aLineData);
                this.oTextData[i].blockWidth = this.getBlockWidth(this.oTextData[i].aLineData);
                this.oTextData[i].blockHeight = this.getBlockHeight(this.oTextData[i].aLineData, assetLib.textData.langText.text[curLang][i]["@fontId"]);
                this.oTextData[i].lineHeight = parseInt(assetLib.textData["fontData" + assetLib.textData.langText.text[curLang][i]["@fontId"]].text.common["@lineHeight"]);
                this.oTextData[i].oFontImgData = assetLib.getData("font" + assetLib.textData.langText.text[curLang][i]["@fontId"]);
            }
        };
        TextDisplay.prototype.getLineWidths = function (_aCharData) {
            var lineLength;
            var aLineWidths = new Array();
            for (var i = 0; i < _aCharData.length; i++) {
                lineLength = 0;
                for (var j = 0; j < _aCharData[i].length; j++) {
                    lineLength += parseInt(_aCharData[i][j]["@xadvance"]);
                    if (j == 0) {
                        lineLength -= parseInt(_aCharData[i][j]["@xoffset"]);
                    }
                    else if (j == _aCharData[i].length - 1) {
                        lineLength += parseInt(_aCharData[i][j]["@xoffset"]);
                    }
                }
                aLineWidths.push(lineLength);
            }
            return aLineWidths;
        };
        TextDisplay.prototype.getBlockWidth = function (_aCharData) {
            var lineLength;
            var longestLineLength = 0;
            for (var i = 0; i < _aCharData.length; i++) {
                lineLength = 0;
                for (var j = 0; j < _aCharData[i].length; j++) {
                    lineLength += parseInt(_aCharData[i][j]["@xadvance"]);
                    if (j == 0) {
                        lineLength -= parseInt(_aCharData[i][j]["@xoffset"]);
                    }
                    else if (j == _aCharData[i].length - 1) {
                        lineLength += parseInt(_aCharData[i][j]["@xoffset"]);
                    }
                }
                if (lineLength > longestLineLength) {
                    longestLineLength = lineLength;
                }
            }
            return longestLineLength;
        };
        TextDisplay.prototype.getBlockHeight = function (_aCharData, _fontId) {
            return _aCharData.length * parseInt(assetLib.textData["fontData" + _fontId].text.common["@lineHeight"]);
        };
        TextDisplay.prototype.getCharData = function (_aLines, _fontId) {
            var aCharData = new Array();
            for (var k = 0; k < _aLines.length; k++) {
                aCharData[k] = new Array();
                for (var i = 0; i < _aLines[k].length; i++) {
                    for (var j = 0; j < assetLib.textData["fontData" + _fontId].text.chars.char.length; j++) {
                        if (_aLines[k][i].charCodeAt(0) == assetLib.textData["fontData" + _fontId].text.chars.char[j]["@id"]) {
                            aCharData[k].push(assetLib.textData["fontData" + _fontId].text.chars.char[j]);
                        }
                    }
                }
            }
            return aCharData;
        };
        TextDisplay.prototype.renderText = function (_oTextDisplayData) {
            var aLinesToRender = this.oTextData[_oTextDisplayData.text].aLineData;
            var oFontImgData = this.oTextData[_oTextDisplayData.text].oFontImgData;
            var shiftX;
            var offsetX = 0;
            var offsetY = 0;
            var lineOffsetY = 0;
            var manualScale = 1;
            var animY = 0;
            if (_oTextDisplayData.lineOffsetY) {
                lineOffsetY = _oTextDisplayData.lineOffsetY;
            }
            if (_oTextDisplayData.scale) {
                manualScale = _oTextDisplayData.scale;
            }
            var textScale = 1 * manualScale;
            if (_oTextDisplayData.maxWidth && this.oTextData[_oTextDisplayData.text].blockWidth * manualScale > _oTextDisplayData.maxWidth) {
                textScale = _oTextDisplayData.maxWidth / this.oTextData[_oTextDisplayData.text].blockWidth;
            }
            if (_oTextDisplayData.anim) {
                this.inc += delta * 7;
            }
            for (var i = 0; i < aLinesToRender.length; i++) {
                shiftX = 0;
                if (_oTextDisplayData.alignX == "centre") {
                    offsetX = this.oTextData[_oTextDisplayData.text].aLineWidths[i] / 2;
                }
                if (_oTextDisplayData.alignY == "centre") {
                    offsetY = this.oTextData[_oTextDisplayData.text].blockHeight / 2 + (lineOffsetY * (aLinesToRender.length - 1)) / 2;
                }
                for (var j = 0; j < aLinesToRender[i].length; j++) {
                    var bX = aLinesToRender[i][j]["@x"];
                    var bY = aLinesToRender[i][j]["@y"];
                    var bWidth = aLinesToRender[i][j]["@width"];
                    var bHeight = aLinesToRender[i][j]["@height"];
                    if (_oTextDisplayData.anim) {
                        animY = Math.sin(this.inc + j / 2) * ((bHeight / 15) * textScale);
                    }
                    ctx.drawImage(oFontImgData.img, bX, bY, bWidth, bHeight, _oTextDisplayData.x + (shiftX + parseInt(aLinesToRender[i][j]["@xoffset"]) - offsetX) * textScale, _oTextDisplayData.y + (parseInt(aLinesToRender[i][j]["@yoffset"]) + (i * this.oTextData[_oTextDisplayData.text].lineHeight) + (i * lineOffsetY) - offsetY) * textScale + animY, bWidth * textScale, bHeight * textScale);
                    shiftX += parseInt(aLinesToRender[i][j]["@xadvance"]);
                }
            }
        };
        return TextDisplay;
    }());
    Utils.TextDisplay = TextDisplay;
})(Utils || (Utils = {}));
var Elements;
(function (Elements) {
    var Jigsaw = (function () {
        function Jigsaw() {
            this.puzzlePxSize = 900;
            this.pieceScale = .75;
            this.slotScale = .83;
            this.curveRate = .03;
            this.inc = 0;
            this.topDepthId = 0;
            this.curHeldId = -1;
            this.curtainAlpha = 0;
            this.slotsAlpha = 0;
            this.pieceNumWidth = aJigsawPieces[Math.min(levelNum, aJigsawPieces.length - 1)][0];
            this.pieceNumHeight = aJigsawPieces[Math.min(levelNum, aJigsawPieces.length - 1)][1];
            this.totalPieces = this.pieceNumWidth * this.pieceNumHeight;
            this.puzzleImg = assetLib.getData("puzzle" + aJigsawOrder[levelNum % jigsawCount]);
            this.aPieces = new Array();
            for (var i = 0; i < this.totalPieces; i++) {
                this.aPieces.push({
                    x: (i % this.pieceNumWidth) * (this.puzzlePxSize / this.pieceNumWidth),
                    y: Math.floor(i / this.pieceNumWidth) * (this.puzzlePxSize / this.pieceNumHeight),
                    offsetX: Math.random() * 300 + 400,
                    offsetY: Math.random() * 300 + 400,
                    actualX: null,
                    actualY: null,
                    actualScale: null,
                    actualRot: null,
                    easeX: 0,
                    easeY: 0,
                    easePerc: 0,
                    easeAlpha: 1,
                    easeTween: null,
                    width: this.puzzlePxSize / this.pieceNumWidth,
                    height: this.puzzlePxSize / this.pieceNumHeight,
                    ranNum: Math.random() * 20 - 10,
                    posState: 0,
                    posId: i,
                    shuffleId: 0,
                    aJoins: this.getJoinArray(i)
                });
                TweenLite.to(this.aPieces[this.aPieces.length - 1], Math.random() * .2 + .5, { offsetX: 0, offsetY: 0, ranNum: Math.random() * 1 - .5, ease: "Cubic.easeOut" });
            }
            this.maxPieceNumSide = Math.max(this.pieceNumWidth, this.pieceNumHeight);
            this.minPieceNumSide = Math.min(this.pieceNumWidth, this.pieceNumHeight);
            shuffleArray(this.aPieces);
            for (var i = 0; i < this.totalPieces; i++) {
                this.aPieces[i].shuffleId = i;
            }
            this.slotsTween = TweenLite.to(this, .5, { slotsAlpha: .25, ease: "Cubic.easeOut", delay: .5 });
            this.oDragData = {
                dragX: null,
                dragY: null,
                dragState: 0,
                startDragX: null,
                startDragY: null,
                prevActualX: null,
                prevActualY: null,
                tappedPieceId: -1
            };
        }
        Jigsaw.prototype.dragStart = function () {
            this.oDragData.dragState = 1;
            var tempCurPiece = this.aPieces[this.curHeldId];
            tempCurPiece.easeScale = 0;
            tempCurPiece.easeRot = 0;
        };
        Jigsaw.prototype.dragRelease = function (_x, _y) {
            var _this = this;
            this.oDragData.dragState = 0;
            var tempCorrect = false;
            for (var i = 0; i < this.aPieces.length; i++) {
                var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
                var tempTileX = ((this.puzzlePxSize / this.pieceNumWidth) * this.slotScale) * panel.oFrameData.scale;
                var tempTileY = ((this.puzzlePxSize / this.pieceNumHeight) * this.slotScale) * panel.oFrameData.scale;
                var tempX = panel.oFrameData.x - (oSData.bWidth / 2) * panel.oFrameData.scale + 26 * panel.oFrameData.scale + (i % this.pieceNumWidth) * tempTileX;
                var tempY = panel.oFrameData.y - (oSData.bHeight / 2) * panel.oFrameData.scale + 26 * panel.oFrameData.scale + Math.floor(i / this.pieceNumWidth) * tempTileY;
                var tempCurPiece = this.aPieces[this.aPieces[this.curHeldId].shuffleId];
                if (tempCurPiece.posState != 3
                    && _x > tempX
                    && _y > tempY
                    && _x < tempX + tempTileX
                    && _y < tempY + tempTileY) {
                    if (i == this.aPieces[this.curHeldId].posId) {
                        playSound("pieceSuccess" + Math.floor(Math.random() * 5));
                        if (firstTimeState == 1) {
                            firstTimeState = 2;
                        }
                        tempCurPiece.posState = 3;
                        this.toggleSlots(false);
                        var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
                        tempCurPiece.easeX = tempCurPiece.actualX - (panel.oFrameData.x - (oSData.bWidth / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumWidth) * this.slotScale / 2 + 26) * panel.oFrameData.scale);
                        tempCurPiece.easeY = tempCurPiece.actualY - (panel.oFrameData.y - (oSData.bHeight / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumHeight) * this.slotScale / 2 + 26) * panel.oFrameData.scale);
                        tempCurPiece.easeScale = tempCurPiece.actualScale - (panel.oFrameData.scale * this.slotScale);
                        tempCurPiece.easeRot = tempCurPiece.actualRot;
                        if (tempCurPiece.easeTween) {
                            tempCurPiece.easeTween.kill();
                        }
                        for (var j = 0; j < 10; j++) {
                            var tempParticle = new Elements.Particle(tempX + tempTileX / 2, tempY + tempTileY / 2, (360 / 10) * j - 90, tempCurPiece.actualScale * ((tempCurPiece.width + tempCurPiece.height) / 3));
                            aParticles.push(tempParticle);
                        }
                        tempCurPiece.easeTween = TweenLite.to(tempCurPiece, .4, {
                            easeX: 0, easeY: 0, easeScale: 0, easeRot: 0, easeAlpha: 0, ease: "Back.easeInOut",
                            onComplete: function () {
                                if (jigsawState != 2) {
                                    _this.checkJigsawComplete();
                                }
                            }
                        });
                        tempCorrect = true;
                        break;
                    }
                }
            }
            if (!tempCorrect) {
                playSound("pieceFail", .5);
                if (tempCurPiece.easeTween) {
                    tempCurPiece.easeTween.kill();
                }
                tempCurPiece.easeX = 0;
                tempCurPiece.easeY = 0;
                var tempId = this.curHeldId;
                var aTempPos = this.getPos(tempId);
                tempCurPiece.easeX = tempCurPiece.actualX - (aTempPos.x - this.aPieces[tempId].x * (aTempPos.scale * (1 + .2 * this.aPieces[tempId].easePerc)) + this.aPieces[tempId].ranNum * aTempPos.xWiggle + this.aPieces[this.curHeldId].offsetX);
                tempCurPiece.easeY = tempCurPiece.actualY - (aTempPos.y - this.aPieces[tempId].y * (aTempPos.scale * (1 + .2 * this.aPieces[tempId].easePerc)) + this.aPieces[tempId].ranNum * aTempPos.yWiggle + this.aPieces[this.curHeldId].offsetY);
                if (tempCurPiece.easeTween) {
                    tempCurPiece.easeTween.kill();
                }
                tempCurPiece.easeTween = TweenLite.to(tempCurPiece, .3, {
                    easeX: 0, easeY: 0, easeScale: 0, easeRot: 0, ease: "Back.easeOut",
                    onComplete: function () {
                    }
                });
            }
        };
        Jigsaw.prototype.checkPieceHit = function (_x, _y) {
            var _this = this;
            if (this.curHeldId != -1) {
                for (var i = 0; i < this.aPieces.length; i++) {
                    var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
                    var tempTileX = ((this.puzzlePxSize / this.pieceNumWidth) * this.slotScale) * panel.oFrameData.scale;
                    var tempTileY = ((this.puzzlePxSize / this.pieceNumHeight) * this.slotScale) * panel.oFrameData.scale;
                    var tempX = panel.oFrameData.x - (oSData.bWidth / 2) * panel.oFrameData.scale + 26 * panel.oFrameData.scale + (i % this.pieceNumWidth) * tempTileX;
                    var tempY = panel.oFrameData.y - (oSData.bHeight / 2) * panel.oFrameData.scale + 26 * panel.oFrameData.scale + Math.floor(i / this.pieceNumWidth) * tempTileY;
                    var tempCurPiece = this.aPieces[this.aPieces[this.curHeldId].shuffleId];
                    if (tempCurPiece.posState != 3
                        && _x > tempX
                        && _y > tempY
                        && _x < tempX + tempTileX
                        && _y < tempY + tempTileY) {
                        if (i == this.aPieces[this.curHeldId].posId) {
                            playSound("pieceSuccess" + Math.floor(Math.random() * 5));
                            if (firstTimeState == 1) {
                                firstTimeState = 2;
                            }
                            tempCurPiece.posState = 3;
                            this.toggleSlots(false);
                            var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
                            tempCurPiece.easeX = tempCurPiece.actualX - (panel.oFrameData.x - (oSData.bWidth / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumWidth) * this.slotScale / 2 + 26) * panel.oFrameData.scale);
                            tempCurPiece.easeY = tempCurPiece.actualY - (panel.oFrameData.y - (oSData.bHeight / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumHeight) * this.slotScale / 2 + 26) * panel.oFrameData.scale);
                            tempCurPiece.easeScale = tempCurPiece.actualScale - (panel.oFrameData.scale * this.slotScale);
                            tempCurPiece.easeRot = tempCurPiece.actualRot;
                            if (tempCurPiece.easeTween) {
                                tempCurPiece.easeTween.kill();
                            }
                            for (var j = 0; j < 10; j++) {
                                var tempParticle = new Elements.Particle(tempX + tempTileX / 2, tempY + tempTileY / 2, (360 / 10) * j - 90, tempCurPiece.actualScale * ((tempCurPiece.width + tempCurPiece.height) / 3));
                                aParticles.push(tempParticle);
                            }
                            tempCurPiece.easeTween = TweenLite.to(tempCurPiece, .4, {
                                easeX: 0, easeY: 0, easeScale: 0, easeRot: 0, easeAlpha: 0, ease: "Back.easeInOut",
                                onComplete: function () {
                                    if (jigsawState != 2) {
                                        _this.checkJigsawComplete();
                                    }
                                }
                            });
                            break;
                        }
                        else {
                            playSound("pieceFail", .5);
                            if (tempCurPiece.easeTween) {
                                tempCurPiece.easeTween.kill();
                            }
                            tempCurPiece.easeX = 0;
                            tempCurPiece.easeY = 0;
                            if (canvas.width > canvas.height) {
                                tempCurPiece.easeTween = TweenLite.to(tempCurPiece, .25, {
                                    easeX: -100 * tempCurPiece.actualScale, ease: "Back.easeInOut",
                                    onComplete: function () {
                                        tempCurPiece.easeTween = TweenLite.to(tempCurPiece, .5, { easeX: 0, ease: "Elastic.easeOut" });
                                    }
                                });
                            }
                            else {
                                tempCurPiece.easeTween = TweenLite.to(tempCurPiece, .25, {
                                    easeY: -100 * tempCurPiece.actualScale, ease: "Back.easeInOut",
                                    onComplete: function () {
                                        tempCurPiece.easeTween = TweenLite.to(tempCurPiece, .5, { easeY: 0, ease: "Elastic.easeOut" });
                                    }
                                });
                            }
                        }
                    }
                }
            }
            var tempId = -1;
            for (var i = 0; i < this.aPieces.length; i++) {
                if (this.aPieces[i].posState < 3) {
                    if (canvas.width > canvas.height) {
                        var tempXseg = (canvas.width / 2 - (panel.oFrameData.buffer * 3)) / this.minPieceNumSide;
                        var tempYseg = (canvas.height - panel.oFrameData.buffer * 2) / this.maxPieceNumSide;
                        if (_x > (canvas.width / 2 + panel.oFrameData.buffer * 2) + tempXseg * (i % this.minPieceNumSide) + tempXseg / 2 - tempXseg / 2
                            && _y > (panel.oFrameData.buffer * 1) + tempYseg * Math.floor(i / this.minPieceNumSide) + tempYseg / 2 - tempYseg / 2
                            && _x < (canvas.width / 2 + panel.oFrameData.buffer * 2) + tempXseg * (i % this.minPieceNumSide) + tempXseg / 2 - tempXseg / 2 + tempXseg
                            && _y < (panel.oFrameData.buffer * 1) + tempYseg * Math.floor(i / this.minPieceNumSide) + tempYseg / 2 - tempYseg / 2 + tempYseg) {
                            tempId = i;
                            break;
                        }
                    }
                    else {
                        var tempXseg = (canvas.width - (panel.oFrameData.buffer * 2)) / this.maxPieceNumSide;
                        var tempYseg = (canvas.height / 2 - panel.oFrameData.buffer * 3) / this.minPieceNumSide;
                        if (_x > panel.oFrameData.buffer + tempXseg * (i % this.maxPieceNumSide) + tempXseg / 2 - tempXseg / 2
                            && _y > (canvas.height / 2 + panel.oFrameData.buffer * 2) + tempYseg * Math.floor(i / this.maxPieceNumSide) + tempYseg / 2 - tempYseg / 2
                            && _x < panel.oFrameData.buffer + tempXseg * (i % this.maxPieceNumSide) + tempXseg / 2 - tempXseg / 2 + tempXseg
                            && _y < (canvas.height / 2 + panel.oFrameData.buffer * 2) + tempYseg * Math.floor(i / this.maxPieceNumSide) + tempYseg / 2 - tempYseg / 2 + tempYseg) {
                            tempId = i;
                            break;
                        }
                    }
                }
            }
            this.oDragData.tappedPieceId = tempId;
            if (tempId != -1) {
                this.oDragData.prevActualX = this.aPieces[tempId].actualX;
                this.oDragData.prevActualY = this.aPieces[tempId].actualY;
                if (firstTimeState == 0) {
                    firstTimeState = 1;
                }
                this.topDepthId = tempId;
                if (this.aPieces[tempId].posState == 1) {
                    playSound("pickUp");
                }
                else {
                    playSound("pickUp");
                    this.curHeldId = this.topDepthId;
                    for (var i = 0; i < this.aPieces.length; i++) {
                        var tempId = i;
                        if (tempId == this.topDepthId) {
                            this.aPieces[tempId].posState = 1;
                            if (this.aPieces[tempId].easeTween) {
                                this.aPieces[tempId].easeTween.kill();
                            }
                            this.aPieces[tempId].easeTween = TweenLite.to(this.aPieces[tempId], .3, { easePerc: 1, ease: "Back.easeOut" });
                            this.topDepthId = this.topDepthId;
                        }
                        else if (this.aPieces[tempId].posState <= 2) {
                            this.aPieces[tempId].posState = 2;
                            if (this.aPieces[tempId].easeTween) {
                                this.aPieces[tempId].easeTween.kill();
                            }
                            this.aPieces[tempId].easeTween = TweenLite.to(this.aPieces[tempId], .5, { easePerc: 0, easeX: 0, easeY: 0, ease: "Bounce.easeOut" });
                        }
                    }
                    this.toggleSlots(true);
                }
            }
        };
        Jigsaw.prototype.checkJigsawComplete = function () {
            var tempIsComplete = true;
            for (var i = 0; i < this.aPieces.length; i++) {
                if (this.aPieces[i].posState != 3) {
                    tempIsComplete = false;
                    break;
                }
            }
            if (tempIsComplete) {
                jigsawState = 2;
                panel.jigsawComplete();
            }
        };
        Jigsaw.prototype.toggleSlots = function (_on) {
            if (_on) {
                if (this.curtainTween) {
                    this.curtainTween.kill();
                }
                this.curtainTween = TweenLite.to(this, .5, { curtainAlpha: .5, ease: "Cubic.easeOut" });
                if (this.slotsTween) {
                    this.slotsTween.kill();
                }
                this.slotsTween = TweenLite.to(this, .5, { slotsAlpha: .75, ease: "Cubic.easeOut" });
            }
            else {
                if (this.curtainTween) {
                    this.curtainTween.kill();
                }
                this.curtainTween = TweenLite.to(this, .3, { curtainAlpha: 0, ease: "Cubic.easeOut" });
                if (this.slotsTween) {
                    this.slotsTween.kill();
                }
                this.slotsTween = TweenLite.to(this, .5, { slotsAlpha: .25, ease: "Cubic.easeOut" });
            }
        };
        Jigsaw.prototype.getJoinArray = function (_posId) {
            var aTemp = new Array();
            for (var i = 0; i < 4; i++) {
                aTemp.push(this.getJoinData(_posId, i));
            }
            if (_posId == 0) {
                aTemp.push(3);
            }
            else if (_posId == this.pieceNumWidth - 1) {
                aTemp.push(0);
            }
            else if (_posId == this.totalPieces - 1) {
                aTemp.push(1);
            }
            else if (_posId == this.totalPieces - this.pieceNumWidth) {
                aTemp.push(2);
            }
            else {
                aTemp.push(4);
            }
            return aTemp;
        };
        Jigsaw.prototype.getJoinData = function (_posId, _dir) {
            var temp;
            switch (_dir) {
                case 0:
                    if (_posId - this.pieceNumWidth >= 0) {
                        if (this.aPieces[_posId - this.pieceNumWidth]) {
                            temp = -this.aPieces[_posId - this.pieceNumWidth].aJoins[2];
                        }
                        else {
                            temp = this.getRandomJoin();
                        }
                    }
                    else {
                        temp = 0;
                    }
                    break;
                case 1:
                    if ((((_posId + 1) % this.pieceNumWidth) != 0)) {
                        if (this.aPieces[_posId + 1]) {
                            temp = -this.aPieces[_posId + 1].aJoins[3];
                        }
                        else {
                            temp = this.getRandomJoin();
                        }
                    }
                    else {
                        temp = 0;
                    }
                    break;
                case 2:
                    if (_posId + this.pieceNumWidth <= this.totalPieces - 1) {
                        if (this.aPieces[_posId + this.pieceNumWidth]) {
                            temp = -this.aPieces[_posId + this.pieceNumWidth].aJoins[0];
                        }
                        else {
                            temp = this.getRandomJoin();
                        }
                    }
                    else {
                        temp = 0;
                    }
                    break;
                case 3:
                    if (((_posId % this.pieceNumWidth) != 0)) {
                        if (this.aPieces[_posId - 1]) {
                            temp = -this.aPieces[_posId - 1].aJoins[1];
                        }
                        else {
                            temp = this.getRandomJoin();
                        }
                    }
                    else {
                        temp = 0;
                    }
                    break;
            }
            return temp;
        };
        Jigsaw.prototype.getRandomJoin = function () {
            if (Math.random() > .5) {
                return -1;
            }
            else {
                return 1;
            }
        };
        Jigsaw.prototype.update = function () {
            this.inc += delta;
        };
        Jigsaw.prototype.getPos = function (_posId) {
            if (canvas.width > canvas.height) {
                var tempXseg = (canvas.width / 2 - (panel.oFrameData.buffer * 3)) / this.minPieceNumSide;
                var tempYseg = (canvas.height - panel.oFrameData.buffer * 2) / this.maxPieceNumSide;
                var tempScale = (Math.min(tempXseg, tempYseg) * this.pieceScale) / Math.max(this.aPieces[_posId].width, this.aPieces[_posId].height);
                return {
                    x: (canvas.width / 2 + panel.oFrameData.buffer * 2) + tempXseg * (_posId % this.minPieceNumSide) + tempXseg / 2,
                    y: (panel.oFrameData.buffer * 1) + tempYseg * Math.floor(_posId / this.minPieceNumSide) + tempYseg / 2,
                    scale: tempScale,
                    xWiggle: ((tempXseg * this.pieceScale) - (tempScale * this.aPieces[_posId].width)) * .5,
                    yWiggle: ((tempYseg * this.pieceScale) - (tempScale * this.aPieces[_posId].height)) * .5
                };
            }
            else {
                var tempXseg = (canvas.width - (panel.oFrameData.buffer * 2)) / this.maxPieceNumSide;
                var tempYseg = (canvas.height / 2 - panel.oFrameData.buffer * 3) / this.minPieceNumSide;
                var tempScale = (Math.min(tempXseg, tempYseg) * this.pieceScale) / Math.max(this.aPieces[_posId].width, this.aPieces[_posId].height);
                return {
                    x: panel.oFrameData.buffer + tempXseg * (_posId % this.maxPieceNumSide) + tempXseg / 2,
                    y: (canvas.height / 2 + panel.oFrameData.buffer * 2) + tempYseg * Math.floor(_posId / this.maxPieceNumSide) + tempYseg / 2,
                    scale: tempScale,
                    xWiggle: ((tempXseg * this.pieceScale) - (tempScale * this.aPieces[_posId].width)) * .5,
                    yWiggle: ((tempYseg * this.pieceScale) - (tempScale * this.aPieces[_posId].height)) * .5
                };
            }
        };
        Jigsaw.prototype.clipPiece = function (_posId) {
            ctx.lineWidth = 22;
            ctx.beginPath();
            ctx.strokeStyle = "rgba(0, 102, 200," + this.aPieces[_posId].easeAlpha + ")";
            this.drawPiece(_posId, 20);
            ctx.closePath();
            ctx.stroke();
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 255, 255," + this.aPieces[_posId].easeAlpha + ")";
            this.drawPiece(_posId, 0);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            this.drawPiece(_posId);
            ctx.closePath();
            ctx.clip();
        };
        Jigsaw.prototype.drawPiece = function (_posId, _offsetY) {
            if (_offsetY === void 0) { _offsetY = 0; }
            var tempSideAv = (this.aPieces[_posId].width + this.aPieces[_posId].height) / 2;
            if (this.aPieces[_posId].aJoins[4] == 3) {
                ctx.moveTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2 + (this.aPieces[_posId].width * this.pieceNumWidth) * this.curveRate, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
            }
            else {
                ctx.moveTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
            }
            if (this.aPieces[_posId].aJoins[0] == 0) {
                if (this.aPieces[_posId].aJoins[4] == 0) {
                    ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2 - (this.aPieces[_posId].width * this.pieceNumWidth) * this.curveRate, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
                    ctx.quadraticCurveTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY, this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + (this.aPieces[_posId].height * this.pieceNumHeight) * this.curveRate + _offsetY);
                }
                else {
                    ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
                }
            }
            else if (this.aPieces[_posId].aJoins[0] == 1) {
                ctx.lineTo(this.aPieces[_posId].x - tempSideAv / 6, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
                ctx.bezierCurveTo(this.aPieces[_posId].x - tempSideAv / 6, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 - tempSideAv / 5 + _offsetY, this.aPieces[_posId].x + (tempSideAv / 6), this.aPieces[_posId].y - this.aPieces[_posId].height / 2 - tempSideAv / 5 + _offsetY, this.aPieces[_posId].x + (tempSideAv / 6), this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
                ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
            }
            else {
                ctx.lineTo(this.aPieces[_posId].x - tempSideAv / 6, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
                ctx.bezierCurveTo(this.aPieces[_posId].x - tempSideAv / 6, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + tempSideAv / 5 + _offsetY, this.aPieces[_posId].x + (tempSideAv / 6), this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + tempSideAv / 5 + _offsetY, this.aPieces[_posId].x + (tempSideAv / 6), this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
                ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
            }
            if (this.aPieces[_posId].aJoins[1] == 0) {
                if (this.aPieces[_posId].aJoins[4] == 1) {
                    ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 - (this.aPieces[_posId].height * this.pieceNumHeight) * this.curveRate + _offsetY);
                    ctx.quadraticCurveTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY, this.aPieces[_posId].x + this.aPieces[_posId].width / 2 - (this.aPieces[_posId].width * this.pieceNumWidth) * this.curveRate, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
                }
                else {
                    ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
                }
            }
            else if (this.aPieces[_posId].aJoins[1] == 1) {
                ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y - tempSideAv / 6 + _offsetY);
                ctx.bezierCurveTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2 + tempSideAv / 5, this.aPieces[_posId].y - tempSideAv / 6 + _offsetY, this.aPieces[_posId].x + this.aPieces[_posId].width / 2 + tempSideAv / 5, this.aPieces[_posId].y + tempSideAv / 6 + _offsetY, this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y + tempSideAv / 6 + _offsetY);
                ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
            }
            else {
                ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y - tempSideAv / 6 + _offsetY);
                ctx.bezierCurveTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2 - tempSideAv / 5, this.aPieces[_posId].y - tempSideAv / 6 + _offsetY, this.aPieces[_posId].x + this.aPieces[_posId].width / 2 - tempSideAv / 5, this.aPieces[_posId].y + tempSideAv / 6 + _offsetY, this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y + tempSideAv / 6 + _offsetY);
                ctx.lineTo(this.aPieces[_posId].x + this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
            }
            if (this.aPieces[_posId].aJoins[2] == 0) {
                if (this.aPieces[_posId].aJoins[4] == 2) {
                    ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2 + (this.aPieces[_posId].width * this.pieceNumWidth) * this.curveRate, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
                    ctx.quadraticCurveTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY, this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 - (this.aPieces[_posId].height * this.pieceNumHeight) * this.curveRate + _offsetY);
                }
                else {
                    ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
                }
            }
            else if (this.aPieces[_posId].aJoins[2] == 1) {
                ctx.lineTo(this.aPieces[_posId].x + tempSideAv / 6, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
                ctx.bezierCurveTo(this.aPieces[_posId].x + tempSideAv / 6, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + tempSideAv / 5 + _offsetY, this.aPieces[_posId].x - tempSideAv / 6, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + tempSideAv / 5 + _offsetY, this.aPieces[_posId].x - tempSideAv / 6, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
                ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
            }
            else {
                ctx.lineTo(this.aPieces[_posId].x + tempSideAv / 6, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
                ctx.bezierCurveTo(this.aPieces[_posId].x + tempSideAv / 6, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 - tempSideAv / 5 + _offsetY, this.aPieces[_posId].x - tempSideAv / 6, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 - tempSideAv / 5 + _offsetY, this.aPieces[_posId].x - tempSideAv / 6, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
                ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y + this.aPieces[_posId].height / 2 + _offsetY);
            }
            if (this.aPieces[_posId].aJoins[3] == 0) {
                if (this.aPieces[_posId].aJoins[4] == 3) {
                    ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + (this.aPieces[_posId].height * this.pieceNumHeight) * this.curveRate + _offsetY);
                    ctx.quadraticCurveTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY, this.aPieces[_posId].x - this.aPieces[_posId].width / 2 + (this.aPieces[_posId].width * this.pieceNumWidth) * this.curveRate, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
                }
                else {
                    ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
                }
            }
            else if (this.aPieces[_posId].aJoins[3] == 1) {
                ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y + tempSideAv / 6 + _offsetY);
                ctx.bezierCurveTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2 - tempSideAv / 5, this.aPieces[_posId].y + tempSideAv / 6 + _offsetY, this.aPieces[_posId].x - this.aPieces[_posId].width / 2 - tempSideAv / 5, this.aPieces[_posId].y - tempSideAv / 6 + _offsetY, this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y - tempSideAv / 6 + _offsetY);
                ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
            }
            else {
                ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y + tempSideAv / 6 + _offsetY);
                ctx.bezierCurveTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2 + tempSideAv / 5, this.aPieces[_posId].y + tempSideAv / 6 + _offsetY, this.aPieces[_posId].x - this.aPieces[_posId].width / 2 + tempSideAv / 5, this.aPieces[_posId].y - tempSideAv / 6 + _offsetY, this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y - tempSideAv / 6 + _offsetY);
                ctx.lineTo(this.aPieces[_posId].x - this.aPieces[_posId].width / 2, this.aPieces[_posId].y - this.aPieces[_posId].height / 2 + _offsetY);
            }
        };
        Jigsaw.prototype.renderSlots = function () {
            var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
            ctx.save();
            ctx.translate(panel.oFrameData.x - (oSData.bWidth / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumWidth) * this.slotScale / 2 + 26) * panel.oFrameData.scale, panel.oFrameData.y - (oSData.bHeight / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumHeight) * this.slotScale / 2 + 26) * panel.oFrameData.scale);
            ctx.scale(panel.oFrameData.scale * this.slotScale, panel.oFrameData.scale * this.slotScale);
            for (var i = 0; i < this.aPieces.length; i++) {
                if (this.aPieces[i].posState != 3) {
                    ctx.lineWidth = 20;
                    ctx.beginPath();
                    ctx.strokeStyle = "#2FCDF2";
                    ctx.fillStyle = "rgba(255, 255, 255," + (this.slotsAlpha + (Math.sin((this.inc * 10 + this.aPieces[i].posId)) * .25) * (this.slotsAlpha - .25)) + ") ";
                    this.drawPiece(i, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            }
            ctx.restore();
        };
        Jigsaw.prototype.render = function () {
            if (jigsawState == 2) {
                return;
            }
            if (this.slotsAlpha > 0) {
                this.renderSlots();
            }
            for (var i = 0; i < this.aPieces.length; i++) {
                var tempId = i;
                var aTempPos = this.getPos(tempId);
                if (this.aPieces[tempId].posState == 3) {
                    var oSData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
                    this.aPieces[tempId].actualX = panel.oFrameData.x - (oSData.bWidth / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumWidth) * this.slotScale / 2 + 26) * panel.oFrameData.scale + this.aPieces[tempId].easeX;
                    this.aPieces[tempId].actualY = panel.oFrameData.y - (oSData.bHeight / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumHeight) * this.slotScale / 2 + 26) * panel.oFrameData.scale + this.aPieces[tempId].easeY;
                    this.aPieces[tempId].actualScale = panel.oFrameData.scale * this.slotScale + this.aPieces[tempId].easeScale;
                    this.aPieces[tempId].actualRot = this.aPieces[tempId].easeRot;
                }
                else {
                    this.aPieces[tempId].actualX = aTempPos.x - this.aPieces[tempId].x * (aTempPos.scale * (1 + .2 * this.aPieces[tempId].easePerc)) + this.aPieces[tempId].ranNum * aTempPos.xWiggle + this.aPieces[i].offsetX + this.aPieces[tempId].easeX;
                    this.aPieces[tempId].actualY = aTempPos.y - this.aPieces[tempId].y * (aTempPos.scale * (1 + .2 * this.aPieces[tempId].easePerc)) + this.aPieces[tempId].ranNum * aTempPos.yWiggle + (Math.sin(this.inc * 4) * 10) * this.aPieces[tempId].easePerc + this.aPieces[i].offsetY + this.aPieces[tempId].easeY;
                    this.aPieces[tempId].actualScale = aTempPos.scale * (1 + .2 * this.aPieces[tempId].easePerc);
                    this.aPieces[tempId].actualRot = (this.aPieces[tempId].ranNum * 6) * radian;
                }
                if (this.topDepthId != tempId) {
                    ctx.save();
                    ctx.translate(this.aPieces[tempId].actualX, this.aPieces[tempId].actualY);
                    ctx.rotate(this.aPieces[tempId].actualRot);
                    ctx.scale(this.aPieces[tempId].actualScale, this.aPieces[tempId].actualScale);
                    this.clipPiece(tempId);
                    ctx.drawImage(this.puzzleImg.img, 0, 0, this.puzzleImg.img.width, this.puzzleImg.img.height, -this.aPieces[tempId].width / 2, -this.aPieces[tempId].height / 2, this.puzzleImg.img.width, this.puzzleImg.img.height);
                    ctx.restore();
                }
            }
            if (canvas.width > canvas.height) {
                var oSData = getSpriteData(assetLib.getData("uiElements"), "curtain");
                var tempScale = 1;
                ctx.fillStyle = "rgba(237,27,152," + this.curtainAlpha + ")";
                ctx.fillRect(canvas.width / 2 + panel.oFrameData.buffer / 2 + panel.posY + (oSData.bWidth - 2) * tempScale, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.globalAlpha = this.curtainAlpha;
                ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth - 2, oSData.bHeight, canvas.width / 2 + panel.oFrameData.buffer / 2 + panel.posY, 0, (oSData.bWidth - 2) * tempScale, oSData.bHeight * tempScale);
                ctx.restore();
            }
            else {
                var oSData = getSpriteData(assetLib.getData("uiElements"), "curtain");
                var tempScale = 1;
                ctx.fillStyle = "rgba(237,27,152," + this.curtainAlpha + ")";
                ctx.fillRect(0, canvas.height / 2 + panel.oFrameData.buffer / 2 + panel.posY + (oSData.bWidth - 2) * tempScale, canvas.width, canvas.height + panel.posY);
                ctx.save();
                ctx.translate(canvas.width, canvas.height / 2 + panel.oFrameData.buffer / 2 + panel.posY);
                ctx.rotate(90 * radian);
                ctx.scale(tempScale, tempScale);
                ctx.globalAlpha = this.curtainAlpha;
                ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth - 2, oSData.bHeight, 0, 0, (oSData.bWidth - 2) * tempScale, oSData.bHeight * tempScale);
                ctx.restore();
            }
            ctx.save();
            tempId = this.topDepthId;
            if (this.oDragData.dragState == 1) {
                this.aPieces[tempId].actualScale = panel.oFrameData.scale * this.slotScale;
                this.aPieces[tempId].actualX = this.oDragData.dragX - (this.aPieces[tempId].x * this.aPieces[tempId].actualScale);
                this.aPieces[tempId].actualY = this.oDragData.dragY - (this.aPieces[tempId].y * this.aPieces[tempId].actualScale);
                this.aPieces[tempId].actualRot = 0;
            }
            ctx.translate(this.aPieces[tempId].actualX, this.aPieces[tempId].actualY);
            ctx.rotate(this.aPieces[tempId].actualRot);
            ctx.scale(this.aPieces[tempId].actualScale, this.aPieces[tempId].actualScale);
            this.clipPiece(tempId);
            ctx.drawImage(this.puzzleImg.img, 0, 0, this.puzzleImg.img.width, this.puzzleImg.img.height, -this.aPieces[tempId].width / 2, -this.aPieces[tempId].height / 2, this.puzzleImg.img.width, this.puzzleImg.img.height);
            ctx.restore();
            if (firstTimeState == 0) {
                var oSData = getSpriteData(assetLib.getData("uiElements"), "tutHand");
                ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, this.aPieces[0].actualX + this.aPieces[0].x * this.aPieces[0].actualScale - oSData.bWidth / 3, this.aPieces[0].actualY + this.aPieces[0].y * this.aPieces[0].actualScale - oSData.bHeight - Math.abs(Math.sin(this.inc * 5) * 30), oSData.bWidth, oSData.bHeight);
            }
            else if (firstTimeState == 1) {
                var oSData = getSpriteData(assetLib.getData("uiElements"), "tutHand");
                var oSFrameData = getSpriteData(assetLib.getData("uiElements"), "jigsawFrame");
                ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, (panel.oFrameData.x - (oSFrameData.bWidth / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumWidth) * this.slotScale / 2 + 26) * panel.oFrameData.scale) + this.aPieces[this.aPieces[this.curHeldId].shuffleId].x * (panel.oFrameData.scale * this.slotScale) - oSData.bWidth / 3, (panel.oFrameData.y - (oSFrameData.bHeight / 2) * panel.oFrameData.scale + ((this.puzzlePxSize / this.pieceNumHeight) * this.slotScale / 2 + 26) * panel.oFrameData.scale) + this.aPieces[this.aPieces[this.curHeldId].shuffleId].y * (panel.oFrameData.scale * this.slotScale) - oSData.bHeight - Math.abs(Math.sin(this.inc * 5) * 30), oSData.bWidth, oSData.bHeight);
            }
        };
        return Jigsaw;
    }());
    Elements.Jigsaw = Jigsaw;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var Particle = (function () {
        function Particle(_startX, _startY, _angle, _dist, _delay) {
            var _this = this;
            if (_dist === void 0) { _dist = 0; }
            if (_delay === void 0) { _delay = 0; }
            this.removeMe = false;
            this.canDisplay = false;
            if (gameState == "game") {
                this.col = "#FFFFFF";
            }
            else {
                this.col = "#ED1B98";
            }
            this.angle = _angle * radian;
            this.dist = _dist + Math.random() * (_dist * .4) - (_dist * .2);
            this.scale = Math.random() * 40 + 20;
            this.x = _startX + this.dist * Math.cos(this.angle);
            this.y = _startY + this.dist * Math.sin(this.angle);
            var tempRange = Math.random() * 200 + 50;
            var tempTime = 1 + Math.random() * .5;
            TweenLite.to(this, tempTime, {
                scale: 0, x: this.x + tempRange * Math.cos(this.angle), y: this.y + tempRange * Math.sin(this.angle), delay: _delay, ease: "Cubic.easeOut",
                onStart: function () { _this.canDisplay = true; },
                onComplete: function () {
                    _this.removeMe = true;
                }
            });
        }
        Particle.prototype.update = function () {
        };
        Particle.prototype.render = function () {
            if (this.canDisplay) {
                ctx.fillStyle = this.col;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.scale, 0, 2 * Math.PI);
                ctx.fill();
            }
        };
        return Particle;
    }());
    Elements.Particle = Particle;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var FlyingPiece = (function () {
        function FlyingPiece() {
            this.removeMe = false;
            this.reset();
        }
        FlyingPiece.prototype.reset = function () {
            this.rot = Math.random() * 360 * radian;
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 200;
            this.id = Math.floor(Math.random() * 3);
            this.scale = Math.random() * .25 + .75;
            this.incX = Math.random() * 300;
            this.incY = -(600 + canvas.height / 3 + Math.random() * 700);
            this.incRot = Math.random() * 2 - 1;
            if (this.x > canvas.width / 2) {
                this.incX *= -1;
            }
        };
        FlyingPiece.prototype.update = function () {
            this.incY += 1000 * delta;
            this.x += this.incX * delta;
            this.y += this.incY * delta;
            this.rot += this.incRot * delta;
            if (this.y > canvas.height + 300) {
                this.reset();
            }
        };
        FlyingPiece.prototype.render = function () {
            ctx.save();
            var oSData = getSpriteData(assetLib.getData("uiElements"), "piece" + this.id);
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rot);
            ctx.scale(this.scale, this.scale);
            ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, -oSData.bWidth / 2, -oSData.bHeight / 2, oSData.bWidth, oSData.bHeight);
            ctx.restore();
        };
        return FlyingPiece;
    }());
    Elements.FlyingPiece = FlyingPiece;
})(Elements || (Elements = {}));
var Utils;
(function (Utils) {
    var SaveDataHandler = (function () {
        function SaveDataHandler(_saveDataId) {
            this.dataGroupNum = 2;
            this.saveDataId = _saveDataId;
            var testKey = 'test';
            var storage;
            var lc = false;
            try {
                storage = window.localStorage;
                lc = true;
            }
            catch (e) {
                console.log("local storage denied");
                lc = false;
                this.canStore = false;
            }
            if (lc) {
                try {
                    storage.setItem(testKey, '1');
                    storage.removeItem(testKey);
                    this.canStore = true;
                }
                catch (error) {
                    this.canStore = false;
                }
            }
            this.clearData();
            this.setInitialData();
        }
        SaveDataHandler.prototype.clearData = function () {
            this.aLevelStore = new Array();
            this.aLevelStore.push(0);
            this.aLevelStore.push(0);
            this.aLevelStore.push(0);
            this.aLevelStore.push(0);
            this.aLevelStore.push(0);
            this.aLevelStore.push(0);
        };
        SaveDataHandler.prototype.resetData = function () {
            this.clearData();
            this.saveData();
        };
        SaveDataHandler.prototype.setInitialData = function () {
            if (this.canStore && typeof (Storage) !== "undefined") {
                if (localStorage.getItem(this.saveDataId) != null && localStorage.getItem(this.saveDataId) != "") {
                    this.aLevelStore = localStorage.getItem(this.saveDataId).split(",");
                    for (var a in this.aLevelStore) {
                        this.aLevelStore[a] = parseInt(this.aLevelStore[a]);
                    }
                }
                else {
                    this.saveData();
                }
            }
        };
        SaveDataHandler.prototype.setData = function (_levelNum, _aData) {
            for (var i = 0; i < _aData.length; i++) {
                if (this.aLevelStore.length == 0 || this.aLevelStore.length <= _levelNum * this.dataGroupNum + i) {
                    for (var j = 0; j < ((_levelNum * this.dataGroupNum) + i) - this.aLevelStore.length - 1; j++) {
                        this.aLevelStore.push(0);
                    }
                    this.aLevelStore.push(_aData[i]);
                }
                else {
                    this.aLevelStore[_levelNum * this.dataGroupNum + i] = _aData[i];
                }
            }
        };
        SaveDataHandler.prototype.getData = function (_levelNum, _id) {
            return this.aLevelStore[_levelNum * this.dataGroupNum + _id];
        };
        SaveDataHandler.prototype.saveData = function () {
            if (this.canStore && typeof (Storage) !== "undefined") {
                var str = "";
                for (var i = 0; i < this.aLevelStore.length; i++) {
                    str += this.aLevelStore[i];
                    if (i < this.aLevelStore.length - 1) {
                        str += ",";
                    }
                }
                localStorage.setItem(this.saveDataId, str);
            }
        };
        return SaveDataHandler;
    }());
    Utils.SaveDataHandler = SaveDataHandler;
})(Utils || (Utils = {}));
var requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.requestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60, new Date().getTime());
        };
})();
var previousTime;
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");
var maxWidth = 900;
var minWidth = 900;
var maxHeight = 900;
var minHeight = 900;
var canvasX;
var canvasY;
var canvasScale;
var isRotated = false;
var div = document.getElementById('canvas-wrapper');
var sound;
var music;
var audioType = 0;
var muted = false;
var splashTimer = 0;
var assetLib;
var preAssetLib;
var isMobile = false;
var gameState = "loading";
var aLangs = new Array("EN");
var curLang = "";
var isBugBrowser = false;
var isIE10 = false;
var delta;
var radian = Math.PI / 180;
var ios9FirstTouch = false;
var hasFocus = true;
var saveDataHandler = new Utils.SaveDataHandler("gameteamplatev1");
var frameBuffer = 2;
var curSoundLoop;
if (navigator.userAgent.match(/MSIE\s([\d]+)/)) {
    isIE10 = true;
}
var deviceAgent = navigator.userAgent.toLowerCase();
if (deviceAgent.match(/(iphone|ipod|ipad)/) ||
    deviceAgent.match(/(android)/) ||
    deviceAgent.match(/(iemobile)/) ||
    deviceAgent.match(/iphone/i) ||
    deviceAgent.match(/ipad/i) ||
    deviceAgent.match(/ipod/i) ||
    deviceAgent.match(/blackberry/i) ||
    deviceAgent.match(/bada/i)) {
    isMobile = true;
    if (deviceAgent.match(/(android)/) && !/Chrome/.test(navigator.userAgent)) {
        isBugBrowser = true;
    }
}
var userInput = new Utils.UserInput(canvas, isBugBrowser);
resizeCanvas();
window.onresize = function () {
    setTimeout(function () {
        resizeCanvas();
    }, 1);
};
function visibleResume() {
    if (!hasFocus) {
        if (userInput) {
            userInput.checkKeyFocus();
        }
        if (!muted && gameState != "pause" && gameState != "splash" && gameState != "loading") {
            Howler.mute(false);
            playMusic();
        }
    }
    hasFocus = true;
}
function visiblePause() {
    hasFocus = false;
    Howler.mute(true);
    music.pause();
}
window.onpageshow = function () {
    if (!hasFocus) {
        if (userInput) {
            userInput.checkKeyFocus();
        }
        if (!muted && gameState != "pause" && gameState != "splash" && gameState != "loading") {
            Howler.mute(false);
            playMusic();
        }
    }
    hasFocus = true;
};
window.onpagehide = function () {
    hasFocus = false;
    Howler.mute(true);
    music.pause();
};
function playMusic() {
    if (!music.playing()) {
        music.play();
    }
}
window.addEventListener("load", function () {
    setTimeout(function () {
        resizeCanvas();
    }, 0);
    window.addEventListener("orientationchange", function () {
        setTimeout(function () {
            resizeCanvas();
        }, 500);
        setTimeout(function () {
            resizeCanvas();
        }, 2000);
    }, false);
});
function isStock() {
    var matches = window.navigator.userAgent.match(/Android.*AppleWebKit\/([\d.]+)/);
    return matches && parseFloat(matches[1]) < 537;
}
var ua = navigator.userAgent;
var isSharpStock = ((/SHL24|SH-01F/i).test(ua)) && isStock();
var isXperiaAStock = ((/SO-04E/i).test(ua)) && isStock();
var isFujitsuStock = ((/F-01F/i).test(ua)) && isStock();
if (!isIE10 && !isSharpStock && !isXperiaAStock && !isFujitsuStock && (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined' || navigator.userAgent.indexOf('Android') == -1)) {
    audioType = 1;
    sound = new Howl({
        "src": [
            "audio/sound.mp3"
        ],
        "sprite": {
            "click": [
                0,
                1908.0045351473923
            ],
            "complete": [
                2500,
                1723.2199546485258
            ],
            "completeSwoosh": [
                5000,
                1333.333333333333
            ],
            "levelIntro": [
                7500,
                1651.5192743764171
            ],
            "pickUp": [
                10000,
                110.36281179138285
            ],
            "pieceFail": [
                11500,
                380.2267573696145
            ],
            "pieceSuccess0": [
                13000,
                1973.6961451247162
            ],
            "pieceSuccess1": [
                15500,
                1861.7687074829946
            ],
            "pieceSuccess2": [
                18000,
                1985.1473922902478
            ],
            "pieceSuccess3": [
                20500,
                1891.0430839002252
            ],
            "pieceSuccess4": [
                23000,
                1980.8163265306114
            ],
            "putDown": [
                25500,
                458.63945578231125
            ],
            "cheers0": [
                27000,
                3320.453514739228
            ],
            "cheers1": [
                31500,
                3529.433106575965
            ],
            "cheers2": [
                36000,
                4133.151927437645
            ],
            "silence": [
                41500,
                502.8798185941028
            ]
        }
    });
    music = new Howl({
        src: ['audio/music.mp3'],
        volume: 0,
        loop: true
    });
}
else {
    audioType = 0;
}
var panel;
var background;
var totalScore = 0;
var levelScore = 0;
var levelNum = 0;
var aTutorials = new Array();
var panelFrame;
var oLogoData = {};
var oLogoBut;
var musicTween;
var oImageIds = {};
var jigsaw;
var jigsawState = 1;
var aParticles;
var jigsawCount;
var aJigsawOrder;
var firstTimeState = 0;
var aJigsawPieces = new Array([2, 2], [2, 2], [2, 2], [2, 2], [2, 3], [2, 3], [3, 2], [3, 2], [3, 3], [3, 3], [3, 3], [3, 3], [3, 4], [3, 4], [4, 3], [4, 3], [4, 4]);
function loadLang(_curLang) {
    if (_curLang === void 0) { _curLang = "en"; }
    curLang = _curLang;
    if (!curLang || curLang == null || curLang == undefined) {
        curLang = "en";
    }
    loadPreAssets();
}
function initSplash() {
    gameState = "splash";
    if (curLang == "ar") {
        document.body.style.direction = "rtl";
    }
    resizeCanvas();
    if (audioType == 1 && !muted) {
        playMusic();
        if (!hasFocus) {
            music.pause();
        }
    }
    aJigsawOrder = new Array();
    for (var i = 1; i < jigsawCount; i++) {
        aJigsawOrder.push(i);
    }
    shuffleArray(aJigsawOrder);
    aJigsawOrder.unshift(0);
    initStartScreen();
}
function initStartScreen() {
    gameState = "start";
    userInput.removeHitArea("moreGames");
    if (audioType == 1) {
        music.fade(music.volume(), .25, 500);
    }
    background = new Elements.Background();
    var oPlayBut = { oImgData: assetLib.getData("uiButs"), aPos: [0, 0], align: [.5, .8], id: oImageIds.playBut, idOver: oImageIds.playButOver, flash: true };
    var oInfoBut = { oImgData: assetLib.getData("uiButs"), aPos: [60, 60], align: [0, 0], id: oImageIds.infoBut, idOver: oImageIds.infoButOver };
    userInput.addHitArea("startGame", butEventHandler, null, "image", oPlayBut);
    userInput.addHitArea("credits", butEventHandler, null, "image", oInfoBut);
    var aButs = new Array(oPlayBut, oInfoBut);
    addMuteBut(aButs);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    aParticles = new Array();
    for (var i = 0; i < 5; i++) {
        var tempFP = new Elements.FlyingPiece();
        aParticles.push(tempFP);
    }
    previousTime = new Date().getTime();
    updateStartScreenEvent();
}
function addMuteBut(_aButs) {
    if (audioType == 1) {
        var mb = oImageIds.muteBut0;
        var mbOver = oImageIds.muteBut0Over;
        if (muted) {
            mb = oImageIds.muteBut1;
            mbOver = oImageIds.muteBut1Over;
        }
        var oMuteBut = { oImgData: assetLib.getData("uiButs"), aPos: [165, 60], align: [0, 0], id: mb, idOver: mbOver };
        userInput.addHitArea("mute", butEventHandler, null, "image", oMuteBut);
        for (var i = 0; i < _aButs.length; i++) {
            if (_aButs[i].id == oImageIds.muteBut0 || _aButs[i].id == oImageIds.muteBut1) {
                return;
            }
        }
        _aButs.push(oMuteBut);
    }
}
function initCreditsScreen() {
    gameState = "credits";
    var oBackBut = { oImgData: assetLib.getData("uiButs"), aPos: [60, 60], align: [0, 0], id: oImageIds.backBut, idOver: oImageIds.backButOver };
    userInput.addHitArea("backFromCredits", butEventHandler, null, "image", oBackBut);
    var aButs = new Array(oBackBut);
    addMuteBut(aButs);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    updateCreditsScreenEvent();
}
function initGame() {
    gameState = "game";
    if (audioType == 1) {
        music.fade(music.volume(), .5, 1000);
    }
    levelNum = 0;
    jigsawState = 1;
    playSound("levelIntro");
    background = new Elements.Background();
    var oBackBut = { oImgData: assetLib.getData("uiButs"), aPos: [60, 60], align: [0, 0], id: oImageIds.backBut, idOver: oImageIds.backButOver };
    userInput.addHitArea("backFromGame", butEventHandler, null, "image", oBackBut);
    var aButs = new Array(oBackBut);
    addMuteBut(aButs);
    userInput.addHitArea("gameTouch", butEventHandler, { isDraggable: true, multiTouch: true }, "rect", { aRect: [0, 110, canvas.width, canvas.height] }, false);
    userInput.addHitArea("gameTouch", butEventHandler, { isDraggable: true, multiTouch: true }, "rect", { aRect: [225, 0, canvas.width, 110] }, false);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    jigsaw = new Elements.Jigsaw();
    aParticles = new Array();
    previousTime = new Date().getTime();
    updateGameEvent();
}
function nextJigsaw() {
    levelNum++;
    jigsawState = 1;
    jigsaw = new Elements.Jigsaw();
    playSound("levelIntro");
    panel.startTween1();
}
function initPause() {
    gameState = "pause";
    var oPlayBut = { oImgData: assetLib.getData("uiButs"), aPos: [-120, 150], align: [.5, .5], id: oImageIds.playBut, idOver: oImageIds.playButOver };
    var oRestartBut = { oImgData: assetLib.getData("uiButs"), aPos: [0, 150], align: [.5, .5], id: oImageIds.replayBut, idOver: oImageIds.replayButOver };
    var oQuitBut = { oImgData: assetLib.getData("uiButs"), aPos: [120, 150], align: [.5, .5], id: oImageIds.quitBut, idOver: oImageIds.quitButOver };
    userInput.addHitArea("playFromPause", butEventHandler, null, "image", oPlayBut);
    userInput.addHitArea("restartFromPause", butEventHandler, null, "image", oRestartBut);
    userInput.addHitArea("quitFromPause", butEventHandler, null, "image", oQuitBut);
    var aButs = new Array(oPlayBut, oRestartBut, oQuitBut);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    background = new Elements.Background();
    updatePauseEvent();
}
function resumeGame() {
    gameState = "game";
    background = new Elements.Background();
    var oPauseBut = { oImgData: assetLib.getData("uiButs"), aPos: [40, 40], align: [0, 0], id: oImageIds.pauseBut, idOver: oImageIds.pauseButOver };
    userInput.addHitArea("pause", butEventHandler, null, "image", oPauseBut);
    var aButs = new Array(oPauseBut);
    addMuteBut(aButs);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    updateGameEvent();
}
function butEventHandler(_id, _oData) {
    switch (_id) {
        case "langSelect":
            curLang = _oData.lang;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            userInput.removeHitArea("langSelect");
            preAssetLib = new Utils.AssetLoader(curLang, [{
                    id: "preloadImage",
                    file: "images/preloadImage.jpg"
                }], ctx, canvas.width, canvas.height, false);
            preAssetLib.onReady(initLoadAssets);
            break;
        case "credits":
            playSound("click");
            userInput.removeHitArea("startGame");
            userInput.removeHitArea("credits");
            userInput.removeHitArea("mute");
            initCreditsScreen();
            break;
        case "backFromCredits":
            playSound("click");
            userInput.removeHitArea("backFromCredits");
            userInput.removeHitArea("mute");
            initStartScreen();
            break;
        case "moreGames":
        case "moreGamesPause":
            playSound("click");
            var url = "http://www.happylander.com";
            var open = window.open(url);
            if (open == null || typeof (open) == 'undefined') {
                location.href = url;
            }
            break;
        case "resetData":
            playSound("click");
            userInput.removeHitArea("backFromCredits");
            userInput.removeHitArea("resetData");
            userInput.removeHitArea("mute");
            initStartScreen();
            break;
        case "startGame":
            playSound("click");
            userInput.removeHitArea("startGame");
            userInput.removeHitArea("moreGames");
            userInput.removeHitArea("credits");
            initGame();
            break;
        case "gameTouch":
            if (jigsawState == 1 && _oData.isDown && !_oData.isBeingDragged) {
                jigsaw.checkPieceHit(_oData.x, _oData.y);
                jigsaw.oDragData.startDragX = _oData.x;
                jigsaw.oDragData.startDragY = _oData.y;
            }
            else if (jigsaw.oDragData.tappedPieceId != -1 && _oData.isBeingDragged) {
                var tempA = _oData.x - jigsaw.oDragData.startDragX;
                var tempB = _oData.y - jigsaw.oDragData.startDragY;
                var tempHyp = tempA * tempA + tempB * tempB;
                if (tempHyp > 250) {
                    if (jigsaw.oDragData.dragState == 0) {
                        jigsaw.dragStart();
                    }
                    jigsaw.oDragData.dragX = _oData.x;
                    jigsaw.oDragData.dragY = _oData.y;
                }
            }
            else {
                if (jigsaw.oDragData.dragState == 1) {
                    jigsaw.dragRelease(_oData.x, _oData.y);
                }
            }
            break;
        case "backFromGame":
            playSound("click");
            clearTimeout(panel.completeTimeOut);
            if (levelNum == 0) {
                firstTimeState = 0;
            }
            userInput.removeHitArea("gameTouch");
            userInput.removeHitArea("backFromGame");
            userInput.removeHitArea("mute");
            initStartScreen();
            break;
        case "nextLevel":
            playSound("click");
            userInput.removeHitArea("jumpHeight");
            userInput.removeHitArea("dashLength");
            userInput.removeHitArea("turnRate");
            userInput.removeHitArea("nextLevel");
            levelScore = 0;
            levelNum++;
            initGame();
            break;
        case "retryFromEnd":
            playSound("click");
            userInput.removeHitArea("retryFromEnd");
            userInput.removeHitArea("quitFromEnd");
            levelScore = 0;
            initGame();
            break;
        case "quitFromEnd":
            playSound("click");
            userInput.removeHitArea("retryFromEnd");
            userInput.removeHitArea("quitFromEnd");
            initStartScreen();
            break;
        case "mute":
            playSound("click");
            toggleMute();
            if (muted) {
                panel.switchBut(oImageIds.muteBut0, oImageIds.muteBut1, oImageIds.muteBut1Over);
            }
            else {
                panel.switchBut(oImageIds.muteBut1, oImageIds.muteBut0, oImageIds.muteBut0Over);
            }
            break;
        case "pause":
            playSound("click");
            if (audioType == 1) {
                Howler.mute(true);
                music.pause();
            }
            else if (audioType == 2) {
                music.pause();
            }
            userInput.removeHitArea("pause");
            userInput.removeHitArea("gameTouch");
            userInput.removeHitArea("mute");
            initPause();
            break;
        case "playFromPause":
            playSound("click");
            if (audioType == 1) {
                if (!muted) {
                    Howler.mute(false);
                    playMusic();
                }
            }
            else if (audioType == 2) {
                if (!muted) {
                    playMusic();
                }
            }
            userInput.removeHitArea("playFromPause");
            userInput.removeHitArea("restartFromPause");
            userInput.removeHitArea("quitFromPause");
            userInput.removeHitArea("mute");
            resumeGame();
            break;
        case "quitFromPause":
            playSound("click");
            if (audioType == 1) {
                if (!muted) {
                    Howler.mute(false);
                    playMusic();
                }
            }
            else if (audioType == 2) {
                if (!muted) {
                    playMusic();
                }
            }
            userInput.removeHitArea("playFromPause");
            userInput.removeHitArea("restartFromPause");
            userInput.removeHitArea("quitFromPause");
            userInput.removeHitArea("mute");
            levelScore = 0;
            totalScore = 0;
            initStartScreen();
            break;
        case "restartFromPause":
            break;
    }
}
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
function updateScore(_inc) {
    levelScore += _inc;
}
function initLevelComplete() {
    gameState = "levelComplete";
    if (audioType == 1) {
        music.fade(music.volume(), .25, 500);
    }
    totalScore += levelScore;
    userInput.removeHitArea("pause");
    var oPlayBut = { oImgData: assetLib.getData("uiButs"), aPos: [0, 140], align: [.5, .5], id: oImageIds.quickGameBut, idOver: oImageIds.quickGameButOver, flash: true };
    userInput.addHitArea("startGame", butEventHandler, null, "image", oPlayBut);
    var aButs = new Array(oPlayBut);
    addMuteBut(aButs);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    updateLevelComplete();
}
function initGameEndFail() {
    gameState = "gameEndFail";
    if (audioType == 1) {
        music.fade(music.volume(), .25, 500);
    }
    userInput.removeHitArea("pause");
    var oRetryBut = { oImgData: assetLib.getData("uiBut"), aPos: [0, 0], align: [.5, .6], id: oImageIds.genSmallBut, noMove: true, text: "retry" };
    var oQuitFromEndBut = { oImgData: assetLib.getData("uiBut"), aPos: [0, 0], align: [.5, .6], id: oImageIds.genSmallBut, noMove: true, text: "quit" };
    userInput.addHitArea("retryFromEnd", butEventHandler, null, "image", oRetryBut);
    userInput.addHitArea("quitFromEnd", butEventHandler, null, "image", oQuitFromEndBut);
    var aButs = new Array(oRetryBut, oQuitFromEndBut);
    addMuteBut(aButs);
    background.render();
    panel = new Elements.Panel(gameState, aButs);
    panel.oScoreData = { totalScore: levelScore + totalScore };
    panel.startTween1();
    previousTime = new Date().getTime();
    updateGameEndFail();
}
function updateGameEvent() {
    if (gameState != "game") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    jigsaw.update();
    jigsaw.render();
    for (var i = 0; i < aParticles.length; i++) {
        aParticles[i].render();
        if (aParticles[i].removeMe) {
            aParticles.splice(i, 1);
            i -= 1;
        }
    }
    checkButtonsOver();
    requestAnimFrame(updateGameEvent);
}
function updateCreditsScreenEvent() {
    if (gameState != "credits") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    checkButtonsOver();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "15px Helvetica";
    ctx.fillText("v1.0.1", canvas.width / 2, canvas.height - 10);
    requestAnimFrame(updateCreditsScreenEvent);
}
function updateLevelComplete() {
    if (gameState != "levelComplete") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    checkButtonsOver();
    requestAnimFrame(updateLevelComplete);
}
function updateGameEndFail() {
    if (gameState != "gameEndFail") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    checkButtonsOver();
    requestAnimFrame(updateGameEndFail);
}
function updateSplashScreenEvent() {
    if (gameState != "splash") {
        return;
    }
    delta = getDelta();
    splashTimer += delta;
    if (splashTimer > 2.5) {
        if (audioType == 1 && !muted) {
            playMusic();
            if (!hasFocus) {
                music.pause();
            }
        }
        initStartScreen();
        return;
    }
    background.render();
    panel.update();
    panel.render();
    checkButtonsOver();
    requestAnimFrame(updateSplashScreenEvent);
}
function updateStartScreenEvent() {
    if (gameState != "start") {
        return;
    }
    delta = getDelta();
    background.render();
    for (var i = 0; i < aParticles.length; i++) {
        aParticles[i].update();
        aParticles[i].render();
        if (aParticles[i].removeMe) {
            aParticles.splice(i, 1);
            i -= 1;
        }
    }
    panel.update();
    panel.render();
    checkButtonsOver();
    requestAnimFrame(updateStartScreenEvent);
}
function updateLoaderEvent() {
    if (gameState != "load") {
        return;
    }
    delta = getDelta();
    assetLib.render();
    requestAnimFrame(updateLoaderEvent);
}
function updatePauseEvent() {
    if (gameState != "pause") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    checkButtonsOver();
    requestAnimFrame(updatePauseEvent);
}
function addDirectText(_font, _size, _width, _align, _x, _y, _str, _col) {
    if (_col === void 0) { _col = "#202020"; }
    ctx.fillStyle = _col;
    ctx.textAlign = _align;
    if (_width < getDirectWidth(_font, _size, _str)) {
        var breakCount = 0;
        _size--;
        while (_width < getDirectWidth(_font, _size, _str)) {
            _size--;
            if (breakCount > 100) {
                break;
            }
        }
    }
    ctx.font = _size + "px " + assetLib.textData.langText["font" + _font][curLang];
    ctx.fillText(_str, _x, _y);
}
function addText(_font, _size, _width, _align, _x, _y, _str, _col) {
    if (_col === void 0) { _col = "#202020"; }
    ctx.fillStyle = _col;
    ctx.textAlign = _align;
    if (_width < getTextWidth(_font, _size, _str)) {
        var breakCount = 0;
        _size--;
        while (_width < getTextWidth(_font, _size, _str)) {
            _size--;
            if (breakCount > 100) {
                break;
            }
        }
    }
    if (curLang == "ar") {
        _y -= _size / 15;
    }
    ctx.font = _size + "px " + assetLib.textData.langText["font" + _font][curLang];
    ctx.fillText(getText(_str), _x, _y);
}
function getText(_str) {
    var tempText = assetLib.textData.langText[_str][curLang];
    if (curLang == "de") {
    }
    return tempText;
}
function getTextWidth(_font, _size, _str) {
    ctx.font = _size + "px " + assetLib.textData.langText["font" + _font][curLang];
    var metrics = ctx.measureText(getText(_str));
    return metrics.width;
}
function getDirectWidth(_font, _size, _str) {
    ctx.font = _size + "px " + assetLib.textData.langText["font" + _font][curLang];
    var metrics = ctx.measureText(_str);
    return metrics.width;
}
function getCorrectedTextWidth(_font, _size, _width, _str) {
    if (_width < getTextWidth(_font, _size, _str)) {
        var breakCount = 0;
        _size--;
        while (_width < getTextWidth(_font, _size, _str)) {
            _size--;
            if (breakCount > 100) {
                break;
            }
        }
    }
    ctx.font = _size + "px " + assetLib.textData.langText["font" + _font][curLang];
    var metrics = ctx.measureText(getText(_str));
    return metrics.width;
}
function checkButtonsOver() {
    if (isMobile) {
        return;
    }
    for (var i = 0; i < panel.aButs.length; i++) {
        panel.aButs[i].isOver = false;
        if (userInput.mouseX > panel.aButs[i].aOverData[0] && userInput.mouseX < panel.aButs[i].aOverData[2] && userInput.mouseY > panel.aButs[i].aOverData[1] && userInput.mouseY < panel.aButs[i].aOverData[3]) {
            panel.aButs[i].isOver = true;
        }
    }
}
function clearButtonOvers() {
    userInput.mouseX = -100;
    userInput.mouseY = -100;
}
function getSpriteData(_sheet, _id) {
    return {
        img: _sheet.img,
        bX: _sheet.oData.oAtlasData[oImageIds[_id]].x,
        bY: _sheet.oData.oAtlasData[oImageIds[_id]].y,
        bWidth: _sheet.oData.oAtlasData[oImageIds[_id]].width,
        bHeight: _sheet.oData.oAtlasData[oImageIds[_id]].height
    };
}
function getDelta() {
    var currentTime = new Date().getTime();
    var deltaTemp = (currentTime - previousTime) / 1000;
    previousTime = currentTime;
    if (deltaTemp > .5) {
        deltaTemp = 0;
    }
    return deltaTemp;
}
function checkSpriteCollision(_s1, _s2) {
    var s1XOffset = _s1.x;
    var s1YOffset = _s1.y;
    var s2XOffset = _s2.x;
    var s2YOffset = _s2.y;
    var distance_squared = (((s1XOffset - s2XOffset) * (s1XOffset - s2XOffset)) + ((s1YOffset - s2YOffset) * (s1YOffset - s2YOffset)));
    var radii_squared = (_s1.radius) * (_s2.radius);
    if (distance_squared < radii_squared) {
        return true;
    }
    else {
        return false;
    }
}
function getScaleImageToMax(_oImgData, _aLimit) {
    var newScale;
    if (_oImgData.isSpriteSheet) {
        if (_aLimit[0] / _oImgData.oData.spriteWidth < _aLimit[1] / _oImgData.oData.spriteHeight) {
            newScale = Math.min(_aLimit[0] / _oImgData.oData.spriteWidth, 1);
        }
        else {
            newScale = Math.min(_aLimit[1] / _oImgData.oData.spriteHeight, 1);
        }
    }
    else {
        if (_aLimit[0] / _oImgData.img.width < _aLimit[1] / _oImgData.img.height) {
            newScale = Math.min(_aLimit[0] / _oImgData.img.width, 1);
        }
        else {
            newScale = Math.min(_aLimit[1] / _oImgData.img.height, 1);
        }
    }
    return newScale;
}
function getCentreFromTopLeft(_aTopLeft, _oImgData, _imgScale) {
    var aCentre = new Array();
    aCentre.push(_aTopLeft[0] + (_oImgData.oData.spriteWidth / 2) * _imgScale);
    aCentre.push(_aTopLeft[1] + (_oImgData.oData.spriteHeight / 2) * _imgScale);
    return aCentre;
}
function loadPreAssets() {
    preAssetLib = new Utils.AssetLoader(curLang, [{
            id: "preloadBg",
            file: "images/preloadBg.jpg"
        }, {
            id: "preloaderElements",
            file: "images/preloaderElements.png",
            oAtlasData: {
                id0: { x: 0, y: 0, width: 512, height: 44 },
                id1: { x: 0, y: 93, width: 300, height: 44 },
                id2: { x: 0, y: 46, width: 300, height: 45 }
            }
        }, {
            id: "preloaderAnim",
            file: "images/preloaderAnim_157x230.png",
            oAnims: {
                firstJump: [0, 1, 2, 3, 4, 5, 6, 7, 8, 0],
                loopJump: [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }
        }], ctx, canvas.width, canvas.height, false);
    oImageIds.logo = "id0";
    oImageIds.bar0 = "id1";
    oImageIds.bar1 = "id2";
    preAssetLib.onReady(initLoadAssets);
}
function initLangSelect() {
    var oImgData;
    var j;
    var k;
    var gap = 10;
    var tileWidthNum = 0;
    var tileHeightNum = 0;
    var butScale = 1;
    for (var i = 0; i < aLangs.length; i++) {
        oImgData = preAssetLib.getData("lang" + aLangs[i]);
        if ((i + 1) * (oImgData.img.width * butScale) + (i + 2) * gap < canvas.width) {
            tileWidthNum++;
        }
        else {
            break;
        }
    }
    tileHeightNum = Math.ceil(aLangs.length / tileWidthNum);
    for (var i = 0; i < aLangs.length; i++) {
        oImgData = preAssetLib.getData("lang" + aLangs[i]);
        j = canvas.width / 2 - (tileWidthNum / 2) * (oImgData.img.width * butScale) - ((tileWidthNum - 1) / 2) * gap;
        j += (i % tileWidthNum) * ((oImgData.img.width * butScale) + gap);
        k = canvas.height / 2 - (tileHeightNum / 2) * (oImgData.img.height * butScale) - ((tileHeightNum - 1) / 2) * gap;
        k += (Math.floor(i / tileWidthNum) % tileHeightNum) * ((oImgData.img.height * butScale) + gap);
        ctx.drawImage(oImgData.img, 0, 0, oImgData.img.width, oImgData.img.height, j, k, (oImgData.img.width * butScale), (oImgData.img.height * butScale));
        var oBut = { oImgData: oImgData, aPos: [j + (oImgData.img.width * butScale) / 2, k + (oImgData.img.height * butScale) / 2], scale: butScale, id: "none", noMove: true };
        userInput.addHitArea("langSelect", butEventHandler, { lang: aLangs[i] }, "image", oBut);
    }
}
function initLoadAssets() {
    loadAssets();
}
function loadAssets() {
    var aTempAssets = new Array({
        id: "bg0",
        file: "images/bg0.jpg"
    }, {
        id: "bg1",
        file: "images/bg1.jpg"
    }, {
        id: "splashLogo",
        file: "images/splashLogo.png"
    }, {
        id: "uiButs",
        file: "images/uiButs.png",
        oAtlasData: {
            id0: { x: 229, y: 182, width: 91, height: 89 },
            id1: { x: 322, y: 182, width: 91, height: 89 },
            id2: { x: 322, y: 91, width: 91, height: 89 },
            id3: { x: 322, y: 0, width: 91, height: 89 },
            id4: { x: 229, y: 273, width: 91, height: 89 },
            id5: { x: 322, y: 273, width: 91, height: 89 },
            id6: { x: 0, y: 0, width: 227, height: 222 },
            id7: { x: 0, y: 224, width: 227, height: 222 },
            id8: { x: 229, y: 91, width: 91, height: 89 },
            id9: { x: 229, y: 0, width: 91, height: 89 }
        }
    }, {
        id: "uiElements",
        file: "images/uiElements.png",
        oAtlasData: {
            id0: { x: 0, y: 902, width: 800, height: 800 },
            id1: { x: 0, y: 0, width: 900, height: 900 },
            id2: { x: 802, y: 1193, width: 155, height: 133 },
            id3: { x: 802, y: 902, width: 178, height: 133 },
            id4: { x: 802, y: 1037, width: 177, height: 154 },
            id5: { x: 802, y: 1328, width: 139, height: 199 }
        }
    }, {
        id: "langText",
        file: "json/text.json"
    }, {
        id: "titleLogo",
        file: "images/title/" + curLang + ".png"
    }, {
        id: "showLogo",
        file: "images/logo.png"
    });
    for (var i = 0; i < jigsawCount; i++) {
        aTempAssets.push({
            id: "puzzle" + i,
            file: "images/jigsaws/p" + i + ".jpg"
        });
    }
    assetLib = new Utils.AssetLoader(curLang, aTempAssets, ctx, canvas.width, canvas.height);
    oImageIds.jigsawFrame = "id0";
    oImageIds.curtain = "id1";
    oImageIds.piece0 = "id2";
    oImageIds.piece1 = "id3";
    oImageIds.piece2 = "id4";
    oImageIds.tutHand = "id5";
    oImageIds.muteBut1 = "id0";
    oImageIds.muteBut1Over = "id1";
    oImageIds.muteBut0 = "id2";
    oImageIds.muteBut0Over = "id3";
    oImageIds.backBut = "id4";
    oImageIds.backButOver = "id5";
    oImageIds.playBut = "id6";
    oImageIds.playButOver = "id7";
    oImageIds.infoBut = "id8";
    oImageIds.infoButOver = "id9";
    assetLib.onReady(initSplash);
    gameState = "load";
    previousTime = new Date().getTime();
    updateLoaderEvent();
}
function resizeCanvas() {
    var tempInnerWidth = window.innerWidth;
    var tempInnerHeight = window.innerHeight;
    canvas.height = tempInnerHeight;
    canvas.width = tempInnerWidth;
    canvas.style.width = tempInnerWidth + "px";
    canvas.style.height = tempInnerHeight + "px";
    var maxW;
    var maxH;
    var minW;
    var minH;
    canvasScale = 1;
    if (tempInnerWidth < tempInnerHeight) {
        maxW = maxWidth;
        maxH = maxHeight;
        minW = minWidth;
        minH = minHeight;
    }
    else {
        maxW = maxHeight;
        maxH = maxWidth;
        minW = minHeight;
        minH = minWidth;
    }
    if (canvas.width / canvas.height < minW / minH) {
        canvas.width = maxW;
        canvas.height = maxW * (tempInnerHeight / tempInnerWidth);
        canvasScale = maxW / tempInnerWidth;
    }
    else {
        canvas.height = minH;
        canvas.width = minH * (tempInnerWidth / tempInnerHeight);
        canvasScale = minH / tempInnerHeight;
    }
    switch (gameState) {
        case "game":
            userInput.removeHitArea("gameTouch");
            userInput.addHitArea("gameTouch", butEventHandler, { isDraggable: true, multiTouch: true }, "rect", { aRect: [0, 110, canvas.width, canvas.height] }, false);
            userInput.addHitArea("gameTouch", butEventHandler, { isDraggable: true, multiTouch: true }, "rect", { aRect: [225, 0, canvas.width, 110] }, false);
            break;
        case "start":
        case "credits":
        case "gameComplete":
            break;
    }
    this.prevCanvasWidth = tempInnerWidth;
    this.prevCanvasHeight = tempInnerHeight;
    window.scrollTo(0, 0);
}
function playSound(_id, _vol) {
    if (_vol === void 0) { _vol = 1; }
    if (audioType == 1) {
        var tempSound = sound.play(_id);
        sound.volume(_vol, tempSound);
    }
}
function loopSound(_id, _vol) {
    if (_vol === void 0) { _vol = 1; }
    if (audioType == 1) {
        sound.loop(true, _id);
        curSoundLoop = sound.play(_id);
        sound.loop(true, curSoundLoop);
        sound.volume(_vol, curSoundLoop);
    }
}
function stopLoopSound() {
    sound.stop(curSoundLoop);
}
function toggleMute() {
    muted = !muted;
    if (audioType == 1) {
        if (muted) {
            Howler.mute(true);
            music.pause();
        }
        else {
            Howler.mute(false);
            playMusic();
            if (gameState == "game") {
                music.volume(.5);
            }
            else {
                music.volume(.25);
            }
        }
    }
    else if (audioType == 2) {
        if (muted) {
            music.pause();
        }
        else {
            playMusic();
        }
    }
}
