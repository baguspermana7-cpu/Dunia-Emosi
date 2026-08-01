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
        function Background(_id) {
            this.x = 0;
            this.y = 0;
            this.targY = 0;
            this.inc = 0;
            this.incY1 = 0;
            this.offsetY = 0;
            this.renderState = null;
            this.aColours = new Array("#F6D638", "#ED1B98", "#FCAEE0", "#2FCDF2", "#32BF5E", "#0066FF");
            this.aChangeColours = new Array("rgba(246, 214, 56,", "rgba(237, 27, 152,", "rgba(252, 174, 224,", "rgba(47, 205, 242,", "rgba(50, 191, 94,", "rgba(0, 102, 255,");
            this.changeAlpha = 1;
            this.changeState = 0;
            this.colId = _id;
            this.oImgData = assetLib.getData("bg" + _id);
        }
        Background.prototype.changeBg = function (_id) {
            var _this = this;
            this.newColId = _id;
            this.oNewImgData = assetLib.getData("bg" + _id);
            if (this.changeTween) {
                this.changeTween.kill();
            }
            this.changeAlpha = 0;
            this.changeState = 1;
            this.changeTween = TweenLite.to(this, .5, {
                changeAlpha: 1, ease: "Linear.easeNone",
                onComplete: function () {
                    _this.colId = _id;
                    _this.oImgData = assetLib.getData("bg" + _id);
                    _this.changeState = 0;
                }
            });
        };
        Background.prototype.render = function () {
            this.inc += delta;
            var tempScale = Math.max(canvas.width, canvas.height) / 1200;
            ctx.fillStyle = this.aColours[this.colId];
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(this.oImgData.img, 0, 0, this.oImgData.img.width, this.oImgData.img.height, canvas.width / 2 - (this.oImgData.img.width / 2) * tempScale + Math.sin(this.inc * .15) * 100, canvas.height / 2 - (this.oImgData.img.height / 2) * tempScale + Math.sin(this.inc * .2) * 100, this.oImgData.img.height * tempScale, this.oImgData.img.height * tempScale);
            if (this.changeState == 1) {
                ctx.fillStyle = this.aChangeColours[this.newColId] + this.changeAlpha + ")";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.globalAlpha = this.changeAlpha;
                ctx.drawImage(this.oNewImgData.img, 0, 0, this.oNewImgData.img.width, this.oNewImgData.img.height, canvas.width / 2 - (this.oNewImgData.img.width / 2) * tempScale + Math.sin(this.inc * .15) * 100, canvas.height / 2 - (this.oNewImgData.img.height / 2) * tempScale + Math.sin(this.inc * .2) * 100, this.oNewImgData.img.height * tempScale, this.oNewImgData.img.height * tempScale);
                ctx.restore();
            }
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
            this.incY = 0;
            this.numberSpace = 68;
            this.flareRot = 0;
            this.bioNum = 0;
            this.particleInc = 0;
            this.aCurtainId = new Array(1, 0, 0, 1, 0, 1);
            this.scoreJiggle = 0;
            this.oSplashLogoImgData = assetLib.getData("splashLogo");
            this.oUiElementsImgData = assetLib.getData("uiElements");
            this.oTopFlareImgData = assetLib.getData("flare");
            this.oTitleLogoImgData = assetLib.getData("titleLogo");
            this.oBioElementsImgData = assetLib.getData("bioElements");
            this.panelType = _panelType;
            this.aButs = _aButs;
            this.oScoreNumbersImgData = assetLib.getData("scoreNumbers");
        }
        Panel.prototype.particleBlast = function () {
            playSound("complete");
            for (var j = 0; j < 20; j++) {
                var tempParticle = new Elements.Particle(canvas.width / 2, canvas.height / 2, (360 / 20) * j - 90, 400, j * .04);
                aParticles.push(tempParticle);
                var tempParticle = new Elements.Particle(canvas.width / 2, canvas.height / 2, (360 / 20) * j + 90, 300, j * .04);
                aParticles.push(tempParticle);
            }
        };
        Panel.prototype.curtainOut = function () {
            if (this.curtainTween) {
                this.curtainTween.kill();
            }
            this.curtainTween = TweenLite.to(this, .5, { posCurtain: 500, ease: "Cubic.easeIn" });
        };
        Panel.prototype.curtainIn = function () {
            if (this.curtainTween) {
                this.curtainTween.kill();
            }
            this.curtainTween = TweenLite.to(this, .5, { posCurtain: 0, ease: "Cubic.easeOut" });
        };
        Panel.prototype.jiggleScore = function () {
            this.scoreJiggle = 50;
            TweenLite.to(this, 1, { scoreJiggle: 0, ease: "Elastic.easeOut" });
        };
        Panel.prototype.update = function () {
            this.incY += 10 * delta;
        };
        Panel.prototype.startTween1 = function () {
            this.posY = 500;
            TweenLite.to(this, .5, { posY: 0, ease: "Back.easeOut" });
            this.posCurtain = 500;
            this.curtainIn();
            this.butsY = 500;
            TweenLite.to(this, .5, { butsY: 0, ease: "Cubic.easeOut" });
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
                    var oSData = getSpriteData(assetLib.getData("uiElements"), "curtain0");
                    ctx.save();
                    ctx.translate(canvas.width, canvas.height * .8 + Math.sin(this.incY) * 10 + this.posY / 2 + oSData.bHeight * tempScale);
                    ctx.rotate(180 * radian);
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
                    var tempWave = Math.sin(this.incY / 4) * 10;
                    this.flareRot += delta / 3;
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2 - this.posY + tempWave);
                    ctx.scale(1, .7);
                    ctx.rotate(this.flareRot);
                    ctx.drawImage(this.oTopFlareImgData.img, -this.oTopFlareImgData.img.width / 2, -this.oTopFlareImgData.img.height / 2);
                    ctx.restore();
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2 - this.posY + tempWave);
                    ctx.scale(1, .7);
                    ctx.rotate(-this.flareRot);
                    ctx.drawImage(this.oTopFlareImgData.img, -this.oTopFlareImgData.img.width / 2, -this.oTopFlareImgData.img.height / 2);
                    ctx.restore();
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.scoreIcon].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.scoreIcon].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.scoreIcon].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.scoreIcon].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 - bWidth / 2, canvas.height / 2 - bHeight / 2 - this.posY - 85 + tempWave, bWidth, bHeight);
                    var tempScore = score.toString();
                    var tempScale = 1;
                    while (tempScore.length < 3) {
                        tempScore = "0" + tempScore;
                    }
                    for (var i = 0; i < tempScore.length; i++) {
                        var id = parseFloat(tempScore.charAt(i));
                        var imgX = (id * this.oScoreNumbersImgData.oData.spriteWidth) % this.oScoreNumbersImgData.img.width;
                        var imgY = Math.floor(id / (this.oScoreNumbersImgData.img.width / this.oScoreNumbersImgData.oData.spriteWidth)) * this.oScoreNumbersImgData.oData.spriteHeight;
                        ctx.drawImage(this.oScoreNumbersImgData.img, imgX, imgY, this.oScoreNumbersImgData.oData.spriteWidth, this.oScoreNumbersImgData.oData.spriteHeight, canvas.width / 2 + (i * this.numberSpace) * tempScale - (tempScore.length * this.numberSpace) / 2 * tempScale, canvas.height / 2 - this.posY + tempWave - 25, this.oScoreNumbersImgData.oData.spriteWidth * tempScale, this.oScoreNumbersImgData.oData.spriteHeight * tempScale);
                    }
                    addText(2, 35, 250, "center", canvas.width / 2, canvas.height / 2 - 30 - this.posY + tempWave, "finalScore", "#250B4D");
                    addText(1, 100, 300, "center", canvas.width / 2, 70 - this.butsY, "gameOver", "#FFFFFF");
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                    ctx.fillRect(canvas.width - 90 - 70, canvas.height * .9 + this.butsY, 140, 42);
                    addText(2, 25, 140, "center", canvas.width - 90, canvas.height * .9 + 28 + this.butsY, "playAgain", "#FFFFFF");
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                    ctx.fillRect(90 - 70, canvas.height - 100 + this.posY, 140, 60);
                    addText(2, 25, 140, "center", 90, canvas.height - 100 + 28 + this.posY, "highScore", "#FFFFFF");
                    var tempScale = .5;
                    var tempScore = saveDataHandler.getData(gameType).toString();
                    while (tempScore.length < 3) {
                        tempScore = "0" + tempScore;
                    }
                    for (var i = 0; i < tempScore.length; i++) {
                        var id = parseFloat(tempScore.charAt(i));
                        var imgX = (id * this.oScoreNumbersImgData.oData.spriteWidth) % this.oScoreNumbersImgData.img.width;
                        var imgY = Math.floor(id / (this.oScoreNumbersImgData.img.width / this.oScoreNumbersImgData.oData.spriteWidth)) * this.oScoreNumbersImgData.oData.spriteHeight;
                        ctx.drawImage(this.oScoreNumbersImgData.img, imgX, imgY, this.oScoreNumbersImgData.oData.spriteWidth, this.oScoreNumbersImgData.oData.spriteHeight, 90 + (i * this.numberSpace) * tempScale - (tempScore.length * this.numberSpace) / 2 * tempScale, canvas.height - 100 + 37 + this.posY, this.oScoreNumbersImgData.oData.spriteWidth * tempScale, this.oScoreNumbersImgData.oData.spriteHeight * tempScale);
                    }
                    break;
                case "game":
                    var oSData = getSpriteData(assetLib.getData("uiElements"), "curtain" + this.aCurtainId[gameBgId]);
                    var tempScale = Math.max(canvas.width, canvas.height) / 900;
                    if (canvas.width > canvas.height) {
                        ctx.save();
                        ctx.translate(Math.min(canvas.width * .85, canvas.width - 150) + Math.sin(this.incY * .5) * 5 + this.posCurtain + oSData.bHeight * tempScale, 0);
                        ctx.rotate(90 * radian);
                        ctx.scale(tempScale, tempScale);
                        ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, 0, 0, oSData.bWidth, oSData.bHeight);
                        ctx.scale(1 / tempScale, 1 / tempScale);
                        ctx.rotate(-90 * radian);
                        ctx.translate(-(Math.min(canvas.width * .85, canvas.width - 150) + Math.sin(this.incY * .5) * 5 + this.posCurtain + oSData.bHeight * tempScale), 0);
                        ctx.translate(Math.max(canvas.width * .15, 150) + Math.sin(this.incY * .5) * 5 - this.posCurtain - oSData.bWidth * tempScale, canvas.height);
                        ctx.rotate(-90 * radian);
                        ctx.scale(tempScale, tempScale);
                        ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, 0, 0, oSData.bWidth, oSData.bHeight);
                        ctx.restore();
                    }
                    else {
                        ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, 0, -oSData.bHeight * tempScale + Math.max(canvas.height * .15, 150) + Math.sin(this.incY * .5) * 5 - this.posCurtain, oSData.bWidth * tempScale, oSData.bHeight * tempScale);
                        ctx.save();
                        ctx.translate(canvas.width, Math.min(canvas.height * .85, canvas.height - 150) + Math.sin(this.incY * .5) * 5 + this.posCurtain + oSData.bHeight * tempScale);
                        ctx.rotate(180 * radian);
                        ctx.scale(tempScale, tempScale);
                        ctx.drawImage(oSData.img, oSData.bX, oSData.bY, oSData.bWidth, oSData.bHeight, 0, 0, oSData.bWidth, oSData.bHeight);
                        ctx.restore();
                    }
                    tempScale = 1;
                    var tempScore = score.toString();
                    for (var i = 0; i < tempScore.length; i++) {
                        var id = parseFloat(tempScore.charAt(i));
                        var imgX = (id * this.oScoreNumbersImgData.oData.spriteWidth) % this.oScoreNumbersImgData.img.width;
                        var imgY = Math.floor(id / (this.oScoreNumbersImgData.img.width / this.oScoreNumbersImgData.oData.spriteWidth)) * this.oScoreNumbersImgData.oData.spriteHeight;
                        ctx.drawImage(this.oScoreNumbersImgData.img, imgX, imgY, this.oScoreNumbersImgData.oData.spriteWidth, this.oScoreNumbersImgData.oData.spriteHeight, canvas.width / 2 + (i * this.numberSpace) * tempScale - 30, 17 + this.scoreJiggle - this.posCurtain, this.oScoreNumbersImgData.oData.spriteWidth * tempScale, this.oScoreNumbersImgData.oData.spriteHeight * tempScale);
                    }
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cup].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cup].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cup].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cup].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 - bWidth / 2 - 190 + 110, 60 + this.scoreJiggle - bHeight / 2 - this.posCurtain, bWidth, bHeight);
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
                            ctx.globalAlpha = Math.max(Math.sin((this.incY + i * 2) / 2), 0) / 2;
                        }
                        else {
                            ctx.globalAlpha = Math.max(Math.sin((this.incY + i * 2) / 2), 0);
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
    var Cards = (function () {
        function Cards(_aLevelCards) {
            this.waitScale = .5;
            this.flareRot = 0;
            this.width = 200 * 2;
            this.height = 167 * 2;
            this.cornerLength = 30;
            this.stretchX = 1;
            this.stretchY = 1;
            this.fingerBounce = 0;
            this.logoScale = 100 / 150;
            this.oCardsImgData = assetLib.getData("cards");
            this.oUiElementsImgData = assetLib.getData("uiElements");
            this.oTopFlareImgData = assetLib.getData("flare");
            this.aLevelCards = _aLevelCards.slice(0);
            this.cardTargId = 0;
            var aPossibleCards = new Array();
            for (var i = 0; i < cardCount; i++) {
                aPossibleCards.push(i);
            }
            var aChosenCards = new Array();
            if (levelNum == 0) {
                for (var i = 0; i < this.aLevelCards.length / 2; i++) {
                    var ran = Math.floor(Math.random() * aPossibleCards.length);
                    aChosenCards.push(i + 5);
                    aChosenCards.push(i + 5);
                    aPossibleCards.splice(ran, 1);
                }
            }
            else {
                for (var i = 0; i < this.aLevelCards.length / 2; i++) {
                    var ran = Math.floor(Math.random() * aPossibleCards.length);
                    aChosenCards.push(aPossibleCards[ran]);
                    aChosenCards.push(aPossibleCards[ran]);
                    aPossibleCards.splice(ran, 1);
                }
            }
            for (var i = 0; i < this.aLevelCards.length; i++) {
                if (Math.random() > .5) {
                    if (Math.random() > .5) {
                        this.aLevelCards[i].curY = canvas.height / 2 + 200;
                    }
                    else {
                        this.aLevelCards[i].curY = -(canvas.height / 2 + 200);
                    }
                    this.aLevelCards[i].curX = Math.random() * canvas.width;
                }
                else {
                    if (Math.random() > .5) {
                        this.aLevelCards[i].curX = canvas.width / 2 + 200;
                    }
                    else {
                        this.aLevelCards[i].curX = -(canvas.width / 2 + 200);
                    }
                    this.aLevelCards[i].curY = Math.random() * canvas.height;
                }
                this.aFlippedCards = new Array();
                this.aLevelCards[i].scaleX = this.waitScale;
                this.aLevelCards[i].scaleY = this.waitScale;
                this.aLevelCards[i].rotation = 0;
                this.aLevelCards[i].flareScale = 0;
                this.aLevelCards[i].sideShowing = 1;
                this.aLevelCards[i].isFlipped = true;
                this.aLevelCards[i].stretchX = 1;
                this.aLevelCards[i].stretchY = 1;
                var ran = Math.floor(Math.random() * aChosenCards.length);
                this.aLevelCards[i].id = aChosenCards[ran];
                aChosenCards.splice(ran, 1);
                this.aLevelCards[i].tween = TweenLite.to(this.aLevelCards[i], 1.3, { delay: i / 40, curX: this.aLevelCards[i].x, curY: this.aLevelCards[i].y, ease: "Expo.easeOut", onComplete: this.startFlipBack, onCompleteParams: [{ scope: this, cardId: i }] });
            }
        }
        Cards.prototype.startFlipBack = function (_oData) {
            _oData.scope.aLevelCards[_oData.cardId].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.cardId], .2, { rotation: 0, scaleX: 0, scaleY: .7, ease: "Cubic.easeIn", delay: 1, onComplete: _oData.scope.startFlipBackHalf, onCompleteParams: [{ scope: _oData.scope, cardId: _oData.cardId }] });
        };
        Cards.prototype.startFlipBackHalf = function (_oData) {
            _oData.scope.aLevelCards[_oData.cardId].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.cardId], .2, { delay: .1, scaleX: _oData.scope.waitScale, scaleY: _oData.scope.waitScale, ease: "Cubic.easeOut", onComplete: _oData.scope.startBackComplete, onCompleteParams: [{ scope: _oData.scope, cardId: _oData.cardId }] });
            _oData.scope.aLevelCards[_oData.cardId].sideShowing = 0;
        };
        Cards.prototype.startBackComplete = function (_oData) {
            _oData.scope.aLevelCards[_oData.cardId].isFlipped = false;
            runTimer = true;
        };
        Cards.prototype.removeCards = function () {
            var targX;
            var targY;
            for (var i = 0; i < this.aLevelCards.length; i++) {
                if (Math.random() > .5) {
                    if (Math.random() > .5) {
                        targY = canvas.height / 2 + 200;
                    }
                    else {
                        targY = -(canvas.height / 2 + 200);
                    }
                    targX = Math.random() * canvas.width;
                }
                else {
                    if (Math.random() > .5) {
                        targX = canvas.width / 2 + 200;
                    }
                    else {
                        targX = -(canvas.width / 2 + 200);
                    }
                    targY = Math.random() * canvas.height;
                }
                this.aLevelCards[i].tween = TweenLite.to(this.aLevelCards[i], .5, { delay: i / 40, curX: targX, curY: targY, ease: "Cubic.easeIn", onComplete: this.levelEnd, onCompleteParams: [{ scope: this, cardId: i }] });
                panel.curtainOut();
            }
        };
        Cards.prototype.levelEnd = function (_oData) {
            if (_oData.cardId == _oData.scope.aLevelCards.length - 1) {
                initLevelComplete();
            }
        };
        Cards.prototype.flipStart = function (_cardId) {
            for (var j = 0; j < 10; j++) {
                var tempParticle = new Elements.Particle(canvas.width / 2 + this.aLevelCards[_cardId].curX, canvas.height / 2 + this.aLevelCards[_cardId].curY, (360 / 10) * j - 90, 100, 0, .5);
                aParticles.push(tempParticle);
            }
            this.aFlippedCards.push(_cardId);
            this.aLevelCards[_cardId].tween.kill();
            this.aLevelCards[_cardId].tween = TweenLite.to(this.aLevelCards[_cardId], .2, { scaleX: 0, scaleY: .7, ease: "Cubic.easeIn", onComplete: this.flipHalf, onCompleteParams: [{ scope: this, cardId: _cardId }] });
            TweenLite.to(this.aLevelCards[_cardId], .5, { flareScale: .5, ease: "Back.easeOut" });
            if (firstRun && this.aFlippedCards.length == 1) {
                for (var i = 0; i < this.aLevelCards.length; i++) {
                    if (this.aLevelCards[this.aFlippedCards[0]].id == this.aLevelCards[i].id && i != _cardId) {
                        this.cardTargId = i;
                        break;
                    }
                }
            }
        };
        Cards.prototype.flipHalf = function (_oData) {
            _oData.scope.aLevelCards[_oData.cardId].tween.kill();
            _oData.scope.aLevelCards[_oData.cardId].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.cardId], .2, { scaleX: .55, scaleY: .55, rotation: 5 * radian, ease: "Cubic.easeOut", onComplete: _oData.scope.flipComplete, onCompleteParams: [_oData] });
            _oData.scope.aLevelCards[_oData.cardId].sideShowing = 1;
        };
        Cards.prototype.flipComplete = function (_oData) {
            var tempScale = 1;
            _oData.scope.aLevelCards[_oData.cardId].isFlipped = true;
            if (_oData.scope.aFlippedCards.length == 2 && _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].isFlipped && _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].isFlipped) {
                if (_oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].id == _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].id) {
                    tempScale = 1 / _oData.scope.aLevelCards[_oData.cardId].posScale;
                    _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].tween.kill();
                    _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]], .5, { rotation: -7 * radian, scaleX: tempScale, scaleY: tempScale, curX: -170, curY: 0, delay: .1, ease: "Back.easeOut", onComplete: _oData.scope.matchComplete, onCompleteParams: [{ scope: _oData.scope }] });
                    TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]], .5, { flareScale: 1, delay: .1, ease: "Back.easeOut" });
                    _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].tween.kill();
                    _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]], .5, { rotation: 7 * radian, scaleX: tempScale, scaleY: tempScale, curX: 170, curY: 0, ease: "Back.easeOut" });
                    TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]], .5, { flareScale: 1, ease: "Back.easeOut" });
                    cardMatch(_oData.scope.aLevelCards[_oData.cardId].id);
                }
                else {
                    playSound("noMatch");
                    tempScale = .7 / _oData.scope.aLevelCards[_oData.cardId].posScale;
                    _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].tween.kill();
                    _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]], .2, { rotation: 0, scaleX: 0, scaleY: tempScale, ease: "Cubic.easeIn", delay: .5, onComplete: _oData.scope.flipBackHalf, onCompleteParams: [{ scope: _oData.scope }] });
                    TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]], .5, { flareScale: 0, delay: .6, ease: "Quad.easeOut" });
                    _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].tween.kill();
                    _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]], .2, { rotation: 0, scaleX: 0, scaleY: tempScale, delay: .4, ease: "Cubic.easeIn" });
                    TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]], .5, { flareScale: 0, delay: .5, ease: "Quad.easeOut" });
                    if (gameType == 2) {
                    }
                }
            }
        };
        Cards.prototype.flipBackHalf = function (_oData) {
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].tween.kill();
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]], .2, { delay: .1, scaleX: _oData.scope.waitScale, scaleY: _oData.scope.waitScale, ease: "Cubic.easeOut", onComplete: _oData.scope.backComplete, onCompleteParams: [{ scope: _oData.scope }] });
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].tween.kill();
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]], .2, { scaleX: _oData.scope.waitScale, scaleY: _oData.scope.waitScale, ease: "Cubic.easeOut" });
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].sideShowing = 0;
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].sideShowing = 0;
            chainCount = 0;
        };
        Cards.prototype.backComplete = function (_oData) {
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].isFlipped = false;
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].isFlipped = false;
            _oData.scope.aFlippedCards = new Array();
            runTimer = true;
        };
        Cards.prototype.matchComplete = function (_oData) {
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].tween.kill();
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]], .2, { rotation: 0, curX: _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].x, curY: _oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]].y, scaleX: _oData.scope.waitScale, scaleY: _oData.scope.waitScale, ease: "Cubic.easeIn", delay: .3, onComplete: _oData.scope.matchBackComplete, onCompleteParams: [{ scope: _oData.scope }] });
            TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[0]], .5, { flareScale: 0, delay: .6, ease: "Quad.easeOut" });
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].tween.kill();
            _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].tween = TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]], .2, { rotation: 0, curX: _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].x, curY: _oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]].y, scaleX: _oData.scope.waitScale, scaleY: _oData.scope.waitScale, delay: .2, ease: "Cubic.easeIn" });
            TweenLite.to(_oData.scope.aLevelCards[_oData.scope.aFlippedCards[1]], .5, { flareScale: 0, delay: .5, ease: "Quad.easeOut" });
        };
        Cards.prototype.matchBackComplete = function (_oData) {
            runTimer = true;
            _oData.scope.aFlippedCards = new Array();
            var levelComplete = true;
            for (var i = 0; i < _oData.scope.aLevelCards.length; i++) {
                if (!_oData.scope.aLevelCards[i].isFlipped) {
                    levelComplete = false;
                    break;
                }
            }
            if (levelComplete) {
                playSound("levelUp");
                _oData.scope.removeCards();
            }
            if (firstRun) {
                for (var i = 0; i < _oData.scope.aLevelCards.length; i++) {
                    if (!_oData.scope.aLevelCards[i].isFlipped) {
                        _oData.scope.cardTargId = i;
                        break;
                    }
                }
            }
        };
        Cards.prototype.update = function () {
            this.flareRot += delta / 3;
            if (canvas.width >= canvas.height) {
                this.stretchX = ((canvas.width / canvas.height) - 1) * .3 + 1;
                this.stretchY = 1;
            }
            else {
                this.stretchX = 1;
                this.stretchY = ((canvas.height / canvas.width) - 1) * .3 + 1;
            }
        };
        Cards.prototype.render = function () {
            for (var i = 0; i < this.aLevelCards.length; i++) {
                var canRender = true;
                for (var j = 0; j < this.aFlippedCards.length; j++) {
                    if (cards.aFlippedCards[j] == i) {
                        canRender = false;
                    }
                }
                if (canRender) {
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "0"]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "0"]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "0"]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "0"]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 + this.aLevelCards[i].curX * this.stretchX - (bWidth / 2) * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleX * 2, canvas.height / 2 + this.aLevelCards[i].curY * this.stretchY - (bHeight / 2) * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleY * 2 + gameAreaOffsetY + 6, bWidth * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleX * 2, bHeight * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleY * 2);
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardBack" + gameBgId]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardBack" + gameBgId]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardBack" + gameBgId]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardBack" + gameBgId]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 + this.aLevelCards[i].curX * this.stretchX - (bWidth / 2) * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleX * 2, canvas.height / 2 + this.aLevelCards[i].curY * this.stretchY - (bHeight / 2) * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleY * 2 + gameAreaOffsetY, bWidth * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleX * 2, bHeight * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleY * 2);
                    var oLogoImage = assetLib.getData("cardLogo");
                    ctx.drawImage(oLogoImage.img, 0, 0, oLogoImage.img.width, oLogoImage.img.height, canvas.width / 2 + this.aLevelCards[i].curX * this.stretchX - (oLogoImage.img.width / 2) * this.aLevelCards[i].posScale * this.logoScale * this.aLevelCards[i].scaleX * 2, canvas.height / 2 + this.aLevelCards[i].curY * this.stretchY - (oLogoImage.img.height / 2) * this.aLevelCards[i].posScale * this.logoScale * this.aLevelCards[i].scaleY * 2 + gameAreaOffsetY, oLogoImage.img.width * this.aLevelCards[i].posScale * this.logoScale * this.aLevelCards[i].scaleX * 2, oLogoImage.img.height * this.aLevelCards[i].posScale * this.logoScale * this.aLevelCards[i].scaleY * 2);
                    if (this.aLevelCards[i].isFlipped && this.aLevelCards[i].sideShowing == 1) {
                        var id = this.aLevelCards[i].id;
                        var imgX = (id * this.oCardsImgData.oData.spriteWidth) % this.oCardsImgData.img.width;
                        var imgY = Math.floor(id / (this.oCardsImgData.img.width / this.oCardsImgData.oData.spriteWidth)) * this.oCardsImgData.oData.spriteHeight;
                        ctx.drawImage(this.oCardsImgData.img, imgX, imgY, this.oCardsImgData.oData.spriteWidth, this.oCardsImgData.oData.spriteHeight, canvas.width / 2 + this.aLevelCards[i].curX * this.stretchX - (this.oCardsImgData.oData.spriteWidth / 2) * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleX, canvas.height / 2 + this.aLevelCards[i].curY * this.stretchY - (this.oCardsImgData.oData.spriteHeight / 2) * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleY + gameAreaOffsetY, this.oCardsImgData.oData.spriteWidth * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleX, this.oCardsImgData.oData.spriteHeight * this.aLevelCards[i].posScale * this.aLevelCards[i].scaleY);
                    }
                }
            }
            for (var i = 0; i < this.aFlippedCards.length; i++) {
            }
            for (var i = 0; i < this.aFlippedCards.length; i++) {
                ctx.save();
                ctx.translate(canvas.width / 2 + this.aLevelCards[this.aFlippedCards[i]].curX * this.stretchX, canvas.height / 2 + this.aLevelCards[this.aFlippedCards[i]].curY * this.stretchY + gameAreaOffsetY);
                ctx.rotate(this.aLevelCards[this.aFlippedCards[i]].rotation);
                if (this.aLevelCards[this.aFlippedCards[i]].sideShowing == 1) {
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "1"]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "1"]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "1"]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "1"]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, -(bWidth / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX, -(bHeight / 2 - 12) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY, bWidth * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX, bHeight * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY);
                    var id = this.aLevelCards[this.aFlippedCards[i]].id;
                    var imgX = (id * this.oCardsImgData.oData.spriteWidth) % this.oCardsImgData.img.width;
                    var imgY = Math.floor(id / (this.oCardsImgData.img.width / this.oCardsImgData.oData.spriteWidth)) * this.oCardsImgData.oData.spriteHeight;
                    ctx.drawImage(this.oCardsImgData.img, imgX, imgY, this.oCardsImgData.oData.spriteWidth, this.oCardsImgData.oData.spriteHeight, -(this.oCardsImgData.oData.spriteWidth / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX, -(this.oCardsImgData.oData.spriteHeight / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY, this.oCardsImgData.oData.spriteWidth * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX, this.oCardsImgData.oData.spriteHeight * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY);
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, -(bWidth / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX, -(bHeight / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY, bWidth * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX, bHeight * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY);
                }
                else {
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "0"]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "0"]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "0"]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardUnder" + panel.aCurtainId[gameBgId] + "0"]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, -(bWidth / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX * 2, -(bHeight / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY * 2 + 6, bWidth * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX * 2, bHeight * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY * 2);
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardBack" + gameBgId]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardBack" + gameBgId]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardBack" + gameBgId]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["cardBack" + gameBgId]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, -(bWidth / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX * 2, -(bHeight / 2) * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY * 2, bWidth * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleX * 2, bHeight * this.aLevelCards[i].posScale * this.aLevelCards[this.aFlippedCards[i]].scaleY * 2);
                    var oLogoImage = assetLib.getData("cardLogo");
                    ctx.drawImage(oLogoImage.img, 0, 0, oLogoImage.img.width, oLogoImage.img.height, -(oLogoImage.img.width / 2) * this.aLevelCards[i].posScale * this.logoScale * this.aLevelCards[this.aFlippedCards[i]].scaleX * 2, -(oLogoImage.img.height / 2) * this.aLevelCards[i].posScale * this.logoScale * this.aLevelCards[this.aFlippedCards[i]].scaleY * 2, oLogoImage.img.width * this.aLevelCards[i].posScale * this.logoScale * this.aLevelCards[this.aFlippedCards[i]].scaleX * 2, oLogoImage.img.height * this.aLevelCards[i].posScale * this.logoScale * this.aLevelCards[this.aFlippedCards[i]].scaleY * 2);
                }
                ctx.restore();
            }
            if (firstRun && !this.aLevelCards[this.cardTargId].isFlipped && cards.aLevelCards[this.cardTargId].sideShowing == 0) {
                this.fingerBounce += delta * 5;
                var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.finger].x;
                var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.finger].y;
                var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.finger].width;
                var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.finger].height;
                ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 + this.aLevelCards[this.cardTargId].curX * this.stretchX - (bWidth / 2) + 30, canvas.height / 2 + this.aLevelCards[this.cardTargId].curY * this.stretchY - (bHeight) - 0 - Math.abs(Math.sin(this.fingerBounce) * 30), bWidth, bHeight);
            }
        };
        return Cards;
    }());
    Elements.Cards = Cards;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var Hud = (function () {
        function Hud() {
            this.numberSpace = 56;
            this.scoreJiggle = 0;
            this.prevSecs = 0;
            this.cardID = 0;
            this.beepTimeTarg = 600;
            this.tJiggle = 0;
            this.lifeY = 0;
            this.lifeX = 0;
            this.popCharInc = 0;
            this.canShowPlus = false;
            this.oHudImgData = assetLib.getData("hud");
            this.oTimeNumbersImgData = assetLib.getData("scoreNumbersBlue");
            this.oScoreNumbersImgData = assetLib.getData("scoreNumbers");
            this.oUiElementsImgData = assetLib.getData("uiElements");
            this.cardTargId = 0;
            this.fingerBounce = 0;
            this.popCharLevelTot = 0;
            this.popCharTimer = Math.random() * 5 + 10;
        }
        Hud.prototype.initMatchAnim = function (_timerBonus, _scoreBonus, _cardID) {
            this.cardID = _cardID;
            this.timerBonus = _timerBonus;
            this.scoreBonus = _scoreBonus;
            this.rainbowY = 0;
            this.rainbowScaleX = .2;
            this.rainbowScaleY = 4;
            this.bonusX = 0;
            this.bonusY = 0;
            TweenLite.to(this, .5, { rainbowY: .5, rainbowScaleX: 1, rainbowScaleY: 1, ease: "Back.easeOut", onComplete: this.rainbowState, onCompleteParams: [{ root: this, state: "in" }] });
            this.jiggle();
        };
        Hud.prototype.initPopChar = function () {
            var _this = this;
            if (++this.popCharLevelTot > 3) {
                this.popCharTimer = Math.random() * 5 + 10;
                return;
            }
            this.popCharTimer = Math.random() * 5 + 10;
            this.popCharId = Math.floor(Math.random() * 3);
            this.popCharInc = 0;
            if (canvas.width > canvas.height) {
                this.popCharSide = Math.floor(Math.random() * 2);
                this.popCharPos = Math.random() * (canvas.height - 300) + 200;
            }
            else {
                this.popCharSide = 2;
                this.popCharPos = Math.random() * (canvas.width - 200) + 100;
            }
            if (this.popCharTween) {
                this.popCharTween.kill();
            }
            this.popCharTween = TweenLite.to(this, .5, {
                popCharInc: 1, ease: "Quad.easeOut",
                onComplete: function () {
                    _this.popCharTween = TweenLite.to(_this, .5, {
                        delay: 1, popCharInc: 0, ease: "Quad.easeIn",
                        onComplete: function () {
                        }
                    });
                }
            });
        };
        Hud.prototype.removePopChar = function () {
            if (this.popCharTween) {
                this.popCharTween.kill();
            }
            this.popCharInc = 0;
            var tempX;
            var tempY;
            if (canvas.width > canvas.height) {
                if (this.popCharSide == 0) {
                    tempX = 85;
                }
                else {
                    tempX = canvas.width - 85;
                }
                tempY = this.popCharPos;
            }
            else {
                tempX = this.popCharPos;
                tempY = canvas.height - 100;
            }
            this.initPlus(0, 100, tempX, tempY);
        };
        Hud.prototype.initPlus = function (_id, _amount, _x, _y) {
            var _this = this;
            if (this.plusTween) {
                this.plusTween.kill();
            }
            this.plusX = _x;
            this.plusY = _y;
            this.canShowPlus = true;
            this.plusAmount = _amount;
            this.plusType = _id;
            this.plusTween = TweenLite.to(this, .7, {
                plusY: this.plusY - 50, ease: "Quad.easeOut",
                onComplete: function () {
                    _this.popCharTween = TweenLite.to(_this, .5, {
                        delay: 0, plusY: _this.plusY - 200, ease: "Back.easeIn",
                        onComplete: function () {
                            _this.canShowPlus = false;
                        }
                    });
                }
            });
        };
        Hud.prototype.jiggle = function () {
            this.scoreJiggle = 50;
            TweenLite.to(this, 1, { scoreJiggle: 0, ease: "Elastic.easeOut" });
        };
        Hud.prototype.timerJiggle = function () {
            this.tJiggle = -50;
            TweenLite.to(this, 2, { tJiggle: 0, ease: "Elastic.easeOut" });
        };
        Hud.prototype.rainbowState = function (_oData) {
            switch (_oData.state) {
                case "in":
                    TweenLite.to(_oData.root, .3, { delay: .5, rainbowY: 0, rainbowScaleX: .5, rainbowScaleY: 2, ease: "Back.easeIn", onComplete: _oData.root.rainbowState, onCompleteParams: [{ root: _oData.root, state: "out" }] });
                    break;
                case "out":
                    break;
            }
        };
        Hud.prototype.loseLife = function () {
            this.tJiggle = -10;
            TweenLite.to(this, .3, { tJiggle: 0, ease: "Back.easeOut" });
            this.lifeY = -500;
            this.lifeX = 0;
            livesNum -= 1;
            if (livesNum == 0) {
                userInput.removeHitArea("hitPlayArea");
            }
            TweenLite.to(this, .75, {
                lifeY: 0, ease: "Cubic.easeIn",
                onComplete: function () {
                    if (livesNum == 0) {
                        userInput.removeHitArea("pause");
                        userInput.removeHitArea("mute");
                        initGameOver();
                    }
                }
            });
            TweenLite.to(this, .3, { lifeX: -30, ease: "Quad.easeOut" });
        };
        Hud.prototype.render = function () {
            var tempHeight = 37;
            var tempScale = .5;
            var scorePos;
            if (gameType == 0) {
                scorePos = canvas.width / 2 - 85;
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                ctx.fillRect(canvas.width / 2 + 85 - 70, 0 - panel.posY, 140, 60);
                addText(2, 25, 140, "center", canvas.width / 2 + 85, 0 + 28 - panel.posY, "time", "#FFFFFF");
            }
            else if (gameType == 1) {
                scorePos = canvas.width / 2;
            }
            else {
                scorePos = canvas.width / 2 - 85;
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                ctx.fillRect(canvas.width / 2 + 85 - 70, 0 - panel.posY, 140, 60);
                addText(2, 25, 140, "center", canvas.width / 2 + 85, 0 + 28 - panel.posY, "lives", "#FFFFFF");
            }
            if (gameType == 0 && (curTime > 500 || Math.round(curTime / 25) % 2 == 0)) {
                if (curTime <= this.beepTimeTarg) {
                    playSound("beep");
                    this.beepTimeTarg -= 100;
                }
                var id;
                var mins = Math.floor(curTime / 6000).toString();
                var tempX = canvas.width / 2 + 12;
                var tempY = tempHeight - panel.posY;
                var secs = Math.floor((curTime - Math.floor(curTime / 6000) * 6000) / 100).toString();
                if (secs.length < 2) {
                    secs = "0" + secs;
                }
                var tenths = curTime.toString().charAt(curTime.toString().length - 2) + curTime.toString().charAt(curTime.toString().length - 1);
                if (tenths.length < 2) {
                    tenths = "0" + tenths;
                }
                for (var i = 0; i < 2; i++) {
                    id = parseFloat(mins.charAt(i));
                    if (mins.length < 2) {
                        if (i == 0) {
                            continue;
                        }
                        else {
                            id = parseFloat(mins.charAt(0));
                        }
                    }
                    var imgX = (id * this.oTimeNumbersImgData.oData.spriteWidth) % this.oTimeNumbersImgData.img.width;
                    var imgY = Math.floor(id / (this.oTimeNumbersImgData.img.width / this.oTimeNumbersImgData.oData.spriteWidth)) * this.oTimeNumbersImgData.oData.spriteHeight;
                    ctx.drawImage(this.oTimeNumbersImgData.img, imgX, imgY, this.oTimeNumbersImgData.oData.spriteWidth, this.oTimeNumbersImgData.oData.spriteHeight, tempX, tempY + this.tJiggle, this.oTimeNumbersImgData.oData.spriteWidth * tempScale, this.oTimeNumbersImgData.oData.spriteHeight * tempScale);
                }
                id = 10;
                var imgX = (id * this.oTimeNumbersImgData.oData.spriteWidth) % this.oTimeNumbersImgData.img.width;
                var imgY = Math.floor(id / (this.oTimeNumbersImgData.img.width / this.oTimeNumbersImgData.oData.spriteWidth)) * this.oTimeNumbersImgData.oData.spriteHeight;
                ctx.drawImage(this.oTimeNumbersImgData.img, imgX, imgY, this.oTimeNumbersImgData.oData.spriteWidth, this.oTimeNumbersImgData.oData.spriteHeight, tempX + 23, tempY + this.tJiggle, this.oTimeNumbersImgData.oData.spriteWidth * tempScale, this.oTimeNumbersImgData.oData.spriteHeight * tempScale);
                for (var i = 0; i < 2; i++) {
                    id = parseFloat(secs.charAt(i));
                    var imgX = (id * this.oTimeNumbersImgData.oData.spriteWidth) % this.oTimeNumbersImgData.img.width;
                    var imgY = Math.floor(id / (this.oTimeNumbersImgData.img.width / this.oTimeNumbersImgData.oData.spriteWidth)) * this.oTimeNumbersImgData.oData.spriteHeight;
                    ctx.drawImage(this.oTimeNumbersImgData.img, imgX, imgY, this.oTimeNumbersImgData.oData.spriteWidth, this.oTimeNumbersImgData.oData.spriteHeight, tempX + 46 + i * this.numberSpace * tempScale, tempY + this.tJiggle, this.oTimeNumbersImgData.oData.spriteWidth * tempScale, this.oTimeNumbersImgData.oData.spriteHeight * tempScale);
                }
                for (var i = 0; i < 2; i++) {
                    id = parseFloat(tenths.charAt(i));
                    var imgX = (id * this.oTimeNumbersImgData.oData.spriteWidth) % this.oTimeNumbersImgData.img.width;
                    var imgY = Math.floor(id / (this.oTimeNumbersImgData.img.width / this.oTimeNumbersImgData.oData.spriteWidth)) * this.oTimeNumbersImgData.oData.spriteHeight;
                    ctx.drawImage(this.oTimeNumbersImgData.img, imgX, imgY, this.oTimeNumbersImgData.oData.spriteWidth, this.oTimeNumbersImgData.oData.spriteHeight, tempX + 103 + i * this.numberSpace * .7 * tempScale, tempY + 10 + this.tJiggle, this.oTimeNumbersImgData.oData.spriteWidth * .7 * tempScale, this.oTimeNumbersImgData.oData.spriteHeight * .7 * tempScale);
                }
            }
            else if (gameType == 2) {
                for (var i = 0; i < 5; i++) {
                    var tempId = 1;
                    if (5 - i <= livesNum) {
                        tempId = 0;
                    }
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["heart" + tempId]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["heart" + tempId]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["heart" + tempId]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["heart" + tempId]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 + 111 - (24) * i, tempHeight - panel.posY + this.tJiggle, bWidth, bHeight);
                }
                if (this.lifeY < 0) {
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.heart0].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.heart0].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.heart0].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.heart0].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 + 20 + this.lifeX, tempHeight + this.lifeY + 500, bWidth, bHeight);
                }
            }
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(scorePos - 70, 0 - panel.posY, 140, 60);
            addText(2, 25, 140, "center", scorePos, 0 + 28 - panel.posY, "score", "#FFFFFF");
            var tempScore = score.toString();
            while (tempScore.length < 5) {
                tempScore = "0" + tempScore;
            }
            for (var i = 0; i < tempScore.length; i++) {
                var id = parseFloat(tempScore.charAt(i));
                var imgX = (id * this.oScoreNumbersImgData.oData.spriteWidth) % this.oScoreNumbersImgData.img.width;
                var imgY = Math.floor(id / (this.oScoreNumbersImgData.img.width / this.oScoreNumbersImgData.oData.spriteWidth)) * this.oScoreNumbersImgData.oData.spriteHeight;
                ctx.drawImage(this.oScoreNumbersImgData.img, imgX, imgY, this.oScoreNumbersImgData.oData.spriteWidth, this.oScoreNumbersImgData.oData.spriteHeight, scorePos + (i * this.numberSpace) * tempScale - (tempScore.length * this.numberSpace) / 2 * tempScale, tempHeight + this.scoreJiggle - panel.posY, this.oScoreNumbersImgData.oData.spriteWidth * tempScale, this.oScoreNumbersImgData.oData.spriteHeight * tempScale);
            }
        };
        Hud.prototype.renderOverlay = function () {
            this.popCharTimer -= delta;
            if (this.popCharTimer < 0) {
                this.initPopChar();
            }
            if (this.popCharInc > 0) {
                if (this.popCharSide == 0) {
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharLeft" + this.popCharId]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharLeft" + this.popCharId]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharLeft" + this.popCharId]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharLeft" + this.popCharId]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, 0 + this.popCharInc * bWidth - bWidth, this.popCharPos - bHeight / 2, bWidth, bHeight);
                    this.popCharX = 0 + this.popCharInc * bWidth - bWidth;
                    this.popCharWidth = bWidth;
                    this.popCharY = this.popCharPos - bHeight / 2;
                    this.popCharHeight = bHeight;
                }
                else if (this.popCharSide == 1) {
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharRight" + this.popCharId]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharRight" + this.popCharId]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharRight" + this.popCharId]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharRight" + this.popCharId]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width - this.popCharInc * bWidth, this.popCharPos - bHeight / 2, bWidth, bHeight);
                    this.popCharX = canvas.width - this.popCharInc * bWidth;
                    this.popCharWidth = bWidth;
                    this.popCharY = this.popCharPos - bHeight / 2;
                    this.popCharHeight = bHeight;
                }
                else {
                    var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharBottom" + this.popCharId]].x;
                    var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharBottom" + this.popCharId]].y;
                    var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharBottom" + this.popCharId]].width;
                    var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds["popCharBottom" + this.popCharId]].height;
                    ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, this.popCharPos - bWidth / 2, canvas.height - this.popCharInc * bHeight, bWidth, bHeight);
                    this.popCharX = this.popCharPos - bWidth / 2;
                    this.popCharWidth = bWidth;
                    this.popCharY = canvas.height - this.popCharInc * bHeight;
                    this.popCharHeight = bHeight;
                }
            }
            if (this.rainbowY > 0) {
                var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.rainbow].x;
                var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.rainbow].y;
                var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.rainbow].width;
                var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.rainbow].height;
                ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 - (bWidth / 2) * this.rainbowScaleX, this.rainbowY * canvas.height - (bHeight / 2) * this.rainbowScaleY - 90, bWidth * this.rainbowScaleX, bHeight * this.rainbowScaleY);
                var tempScale = 1;
                var id = 10;
                var imgX = (id * this.oScoreNumbersImgData.oData.spriteWidth) % this.oScoreNumbersImgData.img.width;
                var imgY = Math.floor(id / (this.oScoreNumbersImgData.img.width / this.oScoreNumbersImgData.oData.spriteWidth)) * this.oScoreNumbersImgData.oData.spriteHeight;
                ctx.drawImage(this.oScoreNumbersImgData.img, imgX, imgY, this.oScoreNumbersImgData.oData.spriteWidth, this.oScoreNumbersImgData.oData.spriteHeight, (canvas.width / 2) - this.numberSpace * tempScale - ((chainCount.toString().length - 1) * this.numberSpace * tempScale) / 2 - 10, this.rainbowY * canvas.height - 180, Math.round(this.oScoreNumbersImgData.oData.spriteWidth * tempScale), Math.round(this.oScoreNumbersImgData.oData.spriteHeight * tempScale));
                for (var i = 0; i < chainCount.toString().length; i++) {
                    var id = parseFloat(chainCount.toString().charAt(i));
                    var imgX = (id * this.oScoreNumbersImgData.oData.spriteWidth) % this.oScoreNumbersImgData.img.width;
                    var imgY = Math.floor(id / (this.oScoreNumbersImgData.img.width / this.oScoreNumbersImgData.oData.spriteWidth)) * this.oScoreNumbersImgData.oData.spriteHeight;
                    ctx.drawImage(this.oScoreNumbersImgData.img, imgX, imgY, this.oScoreNumbersImgData.oData.spriteWidth, this.oScoreNumbersImgData.oData.spriteHeight, (canvas.width / 2) + (i * this.numberSpace) * tempScale - ((chainCount.toString().length - 1) * (this.numberSpace - 1) * tempScale) / 2 - 10, this.rainbowY * canvas.height - 180, this.oScoreNumbersImgData.oData.spriteWidth * tempScale, this.oScoreNumbersImgData.oData.spriteHeight * tempScale);
                }
            }
            if (firstRun && !cards.aLevelCards[this.cardTargId].isFlipped && cards.aLevelCards[this.cardTargId].sideShowing == 0) {
                this.fingerBounce += delta * 5;
                var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.finger].x;
                var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.finger].y;
                var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.finger].width;
                var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.finger].height;
                ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 + cards.aLevelCards[this.cardTargId].curX - (bWidth / 2) + 10, canvas.height / 2 + cards.aLevelCards[this.cardTargId].curY - (bHeight / 2) - 35 - Math.abs(Math.sin(this.fingerBounce) * 30), bWidth, bHeight);
            }
            if (this.canShowPlus) {
                var numberType;
                if (this.plusType == 0) {
                    numberType = this.oScoreNumbersImgData;
                }
                else {
                    numberType = this.oTimeNumbersImgData;
                }
                tempScale = .5;
                var imgX = (11 * numberType.oData.spriteWidth) % numberType.img.width;
                var imgY = Math.floor(11 / (numberType.img.width / numberType.oData.spriteWidth)) * numberType.oData.spriteHeight;
                ctx.drawImage(numberType.img, imgX, imgY, numberType.oData.spriteWidth, numberType.oData.spriteHeight, this.plusX - ((this.plusAmount.toString().length + 1) * (this.numberSpace) * tempScale) / 2, this.plusY, numberType.oData.spriteWidth * tempScale, numberType.oData.spriteHeight * tempScale);
                for (var i = 0; i < this.plusAmount.toString().length; i++) {
                    var id = parseFloat(this.plusAmount.toString().charAt(i));
                    var imgX = (id * numberType.oData.spriteWidth) % numberType.img.width;
                    var imgY = Math.floor(id / (numberType.img.width / numberType.oData.spriteWidth)) * numberType.oData.spriteHeight;
                    ctx.drawImage(numberType.img, imgX, imgY, numberType.oData.spriteWidth, numberType.oData.spriteHeight, this.plusX + ((i + 1) * this.numberSpace) * tempScale - ((this.plusAmount.toString().length + 1) * (this.numberSpace) * tempScale) / 2, this.plusY, numberType.oData.spriteWidth * tempScale, numberType.oData.spriteHeight * tempScale);
                }
            }
        };
        return Hud;
    }());
    Elements.Hud = Hud;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var FallingCard = (function () {
        function FallingCard() {
            this.x = 0;
            this.y = 0;
            this.rotation = 0;
            this.oCardsImgData = assetLib.getData("cards");
            this.oUiElementsImgData = assetLib.getData("uiElements");
            this.reset();
            this.y = Math.random() * canvas.height - canvas.height / 2;
        }
        FallingCard.prototype.reset = function () {
            this.x = Math.random() * canvas.width;
            this.y = -(canvas.height / 2 + 200);
            this.incY = Math.random() * 150 + 200;
            this.id = Math.floor(Math.random() * 20);
            this.rotation = Math.random() * 3.14;
            this.rotInc = Math.random() * 4 - 2;
            this.scale = .5;
        };
        FallingCard.prototype.update = function () {
            this.y += delta * this.incY;
            this.rotation += delta * this.rotInc;
            if (this.y > canvas.height / 2 + 200) {
                this.reset();
            }
        };
        FallingCard.prototype.render = function () {
            ctx.save();
            ctx.translate(this.x, canvas.height / 2 + this.y);
            ctx.rotate(this.rotation);
            var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].x;
            var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].y;
            var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].width;
            var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].height;
            ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, -(bWidth / 2 - 4) * this.scale, -(bHeight / 2 - 4) * this.scale, bWidth * this.scale, bHeight * this.scale);
            var id = this.id;
            var imgX = (id * this.oCardsImgData.oData.spriteWidth) % this.oCardsImgData.img.width;
            var imgY = Math.floor(id / (this.oCardsImgData.img.width / this.oCardsImgData.oData.spriteWidth)) * this.oCardsImgData.oData.spriteHeight;
            ctx.drawImage(this.oCardsImgData.img, imgX + 1, imgY + 1, this.oCardsImgData.oData.spriteWidth - 2, this.oCardsImgData.oData.spriteHeight - 2, -(this.oCardsImgData.oData.spriteWidth / 2) * this.scale, -(this.oCardsImgData.oData.spriteHeight / 2) * this.scale, this.oCardsImgData.oData.spriteWidth * this.scale, this.oCardsImgData.oData.spriteHeight * this.scale);
            ctx.restore();
        };
        return FallingCard;
    }());
    Elements.FallingCard = FallingCard;
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
        SaveDataHandler.prototype.setData = function (_id, _score) {
            if (this.aLevelStore[_id] < _score) {
                this.aLevelStore[_id] = _score;
            }
        };
        SaveDataHandler.prototype.getData = function (_id) {
            return this.aLevelStore[_id];
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
var Elements;
(function (Elements) {
    var Particle = (function () {
        function Particle(_startX, _startY, _angle, _dist, _delay, _scale) {
            var _this = this;
            if (_dist === void 0) { _dist = 0; }
            if (_delay === void 0) { _delay = 0; }
            if (_scale === void 0) { _scale = 1; }
            this.removeMe = false;
            this.canDisplay = false;
            if (gameState == "game") {
                this.col = "#FFFFFF";
            }
            else {
                this.col = "#0066FF";
            }
            this.offsetScale = _scale;
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
                ctx.arc(this.x, this.y, this.scale * this.offsetScale, 0, 2 * Math.PI);
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
            this.oCardsImgData = assetLib.getData("cards");
            this.oUiElementsImgData = assetLib.getData("uiElements");
            this.rot = Math.random() * 360 * radian;
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 200;
            this.id = Math.floor(Math.random() * cardCount);
            this.scale = Math.random() * .15 + .3;
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
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rot);
            ctx.scale(this.scale, this.scale);
            var imgX = (this.id * this.oCardsImgData.oData.spriteWidth) % this.oCardsImgData.img.width;
            var imgY = Math.floor(this.id / (this.oCardsImgData.img.width / this.oCardsImgData.oData.spriteWidth)) * this.oCardsImgData.oData.spriteHeight;
            ctx.drawImage(this.oCardsImgData.img, imgX, imgY, this.oCardsImgData.oData.spriteWidth, this.oCardsImgData.oData.spriteHeight, -(this.oCardsImgData.oData.spriteWidth / 2), -(this.oCardsImgData.oData.spriteHeight / 2), this.oCardsImgData.oData.spriteWidth, this.oCardsImgData.oData.spriteHeight);
            var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].x;
            var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].y;
            var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].width;
            var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.cardFront].height;
            ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, -(bWidth / 2), -(bHeight / 2), bWidth, bHeight);
            var bX = this.oUiElementsImgData.oData.oAtlasData[oImageIds.introCard].x;
            var bY = this.oUiElementsImgData.oData.oAtlasData[oImageIds.introCard].y;
            var bWidth = this.oUiElementsImgData.oData.oAtlasData[oImageIds.introCard].width;
            var bHeight = this.oUiElementsImgData.oData.oAtlasData[oImageIds.introCard].height;
            ctx.drawImage(this.oUiElementsImgData.img, bX, bY, bWidth, bHeight, -(bWidth / 2), -(bHeight / 2), bWidth, bHeight);
            ctx.restore();
        };
        return FlyingPiece;
    }());
    Elements.FlyingPiece = FlyingPiece;
})(Elements || (Elements = {}));
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
var textDisplay;
var hasFocus = true;
var frameBuffer = 2;
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
        src: ['audio/sound.ogg', 'audio/sound.m4a'],
        sprite: {
            click: [0, 700],
            levelUp: [1000, 1500],
            gameOver: [3000, 1200],
            match0: [4500, 1500],
            match1: [6500, 1500],
            match2: [8500, 1500],
            match3: [10500, 1500],
            match4: [12500, 1500],
            levelStart: [14500, 1100],
            card0: [16000, 1000],
            card1: [17500, 1000],
            beep: [19000, 200],
            noMatch: [19500, 800]
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
var hud;
var background;
var score = 0;
var levelNum;
var aTutorials = new Array();
var panelFrame;
var oLogoData = {};
var oLogoBut;
var oImageIds = {};
var cards;
var aFireworks;
var gameBgId = Math.floor(Math.random() * 6);
var gameAreaOffsetY;
var curTime;
var chainCount;
var saveDataHandler = new Utils.SaveDataHandler("cnmu_v1");
var highscore;
var firstRun = true;
var aFallingCards;
var gameType;
var runTimer;
var livesNum;
var aParticles;
var cardCount = 16;
var aCardPos = new Array({ aData: [{ x: -163, y: -139, posScale: 1.5 }, { x: 164, y: -139, posScale: 1.5 }, { x: -163, y: 140, posScale: 1.5 }, { x: 164, y: 140, posScale: 1.5 }] }, { aData: [{ x: -196, y: -235, posScale: 1.5 }, { x: 272, y: -100, posScale: 1.5 }, { x: -272, y: 89, posScale: 1.5 }, { x: 187, y: 237, posScale: 1.5 }] }, { aData: [{ x: -120, y: -261, posScale: 1.1999969482421875 }, { x: -300, y: -5, posScale: 1.1999969482421875 }, { x: -119, y: 264, posScale: 1.1999969482421875 }, { x: 302, y: -261, posScale: 1.1999969482421875 }, { x: 122, y: -5, posScale: 1.1999969482421875 }, { x: 303, y: 264, posScale: 1.1999969482421875 }] }, { aData: [{ x: -127, y: -222, posScale: 1.1999969482421875 }, { x: 129, y: -222, posScale: 1.1999969482421875 }, { x: -300, y: 1, posScale: 1.1999969482421875 }, { x: 306, y: 1, posScale: 1.1999969482421875 }, { x: -127, y: 224, posScale: 1.1999969482421875 }, { x: 129, y: 224, posScale: 1.1999969482421875 }] }, { aData: [{ x: -258, y: -222, posScale: 1.1999969482421875 }, { x: 253, y: -222, posScale: 1.1999969482421875 }, { x: -129, y: 1, posScale: 1.1999969482421875 }, { x: 133, y: 1, posScale: 1.1999969482421875 }, { x: -258, y: 224, posScale: 1.1999969482421875 }, { x: 253, y: 224, posScale: 1.1999969482421875 }] }, { aData: [{ x: -259, y: -222, posScale: 1.1999969482421875 }, { x: 2, y: -222, posScale: 1.1999969482421875 }, { x: 259, y: -222, posScale: 1.1999969482421875 }, { x: -259, y: 1, posScale: 1.1999969482421875 }, { x: 259, y: 1, posScale: 1.1999969482421875 }, { x: -259, y: 224, posScale: 1.1999969482421875 }, { x: 2, y: 224, posScale: 1.1999969482421875 }, { x: 259, y: 224, posScale: 1.1999969482421875 }] }, { aData: [{ x: -259, y: -221, posScale: 1.1999969482421875 }, { x: 2, y: -221, posScale: 1.1999969482421875 }, { x: 259, y: -221, posScale: 1.1999969482421875 }, { x: -259, y: 2, posScale: 1.1999969482421875 }, { x: 2, y: 2, posScale: 1.1999969482421875 }, { x: 259, y: 2, posScale: 1.1999969482421875 }, { x: -131, y: 225, posScale: 1.1999969482421875 }, { x: 131, y: 225, posScale: 1.1999969482421875 }] }, { aData: [{ x: -303, y: -263, posScale: 1.1999969482421875 }, { x: 2, y: -209, posScale: 1.1999969482421875 }, { x: 305, y: -265, posScale: 1.1999969482421875 }, { x: -249, y: 4, posScale: 1.1999969482421875 }, { x: 249, y: 4, posScale: 1.1999969482421875 }, { x: -302, y: 263, posScale: 1.1999969482421875 }, { x: 2, y: 217, posScale: 1.1999969482421875 }, { x: 303, y: 264, posScale: 1.1999969482421875 }] }, { aData: [{ x: -258, y: -261, posScale: 1.1999969482421875 }, { x: -1, y: -261, posScale: 1.1999969482421875 }, { x: 261, y: -261, posScale: 1.1999969482421875 }, { x: -132, y: -42, posScale: 1.1999969482421875 }, { x: -258, y: 263, posScale: 1.1999969482421875 }, { x: -1, y: 263, posScale: 1.1999969482421875 }, { x: 261, y: 263, posScale: 1.1999969482421875 }, { x: 132, y: 45, posScale: 1.1999969482421875 }] }, { aData: [{ x: -301, y: -261, posScale: 1.1999969482421875 }, { x: -44, y: -261, posScale: 1.1999969482421875 }, { x: 213, y: -175, posScale: 1.1999969482421875 }, { x: 306, y: 42, posScale: 1.1999969482421875 }, { x: -301, y: -37, posScale: 1.1999969482421875 }, { x: -207, y: 186, posScale: 1.1999969482421875 }, { x: 49, y: 266, posScale: 1.1999969482421875 }, { x: 306, y: 266, posScale: 1.1999969482421875 }] }, { aData: [{ x: -11, y: -245, posScale: 1.1999969482421875 }, { x: -21, y: 15, posScale: 1.1999969482421875 }, { x: -300, y: -172, posScale: 1.1999969482421875 }, { x: 296, y: -260, posScale: 1.1999969482421875 }, { x: -276, y: 188, posScale: 1.1999969482421875 }, { x: 243, y: -26, posScale: 1.1999969482421875 }, { x: 11, y: 263, posScale: 1.1999969482421875 }, { x: 308, y: 204, posScale: 1.1999969482421875 }] }, { aData: [{ x: 47, y: -265, posScale: 1.1999969482421875 }, { x: 304, y: -265, posScale: 1.1999969482421875 }, { x: 306, y: 266, posScale: 1.1999969482421875 }, { x: 244, y: -42, posScale: 1.1999969482421875 }, { x: -224, y: 41, posScale: 1.1999969482421875 }, { x: -301, y: -261, posScale: 1.1999969482421875 }, { x: -304, y: 264, posScale: 1.1999969482421875 }, { x: -47, y: 264, posScale: 1.1999969482421875 }] }, { aData: [{ x: -303, y: 48, posScale: 1.1999969482421875 }, { x: 306, y: -34, posScale: 1.1999969482421875 }, { x: 42, y: -141, posScale: 1.1999969482421875 }, { x: 304, y: -261, posScale: 1.1999969482421875 }, { x: -50, y: 164, posScale: 1.1999969482421875 }, { x: -300, y: -262, posScale: 1.1999969482421875 }, { x: -302, y: 266, posScale: 1.1999969482421875 }, { x: 305, y: 266, posScale: 1.1999969482421875 }] }, { aData: [{ x: -322, y: -278, posScale: 1 }, { x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: 324, y: -278, posScale: 1 }, { x: -322, y: -92, posScale: 1 }, { x: 324, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: 324, y: 94, posScale: 1 }, { x: -322, y: 280, posScale: 1 }, { x: 324, y: 280, posScale: 1 }] }, { aData: [{ x: -322, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: 324, y: -278, posScale: 1 }, { x: -108, y: -92, posScale: 1 }, { x: 110, y: -92, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: 110, y: 94, posScale: 1 }, { x: -322, y: 280, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 324, y: 280, posScale: 1 }] }, { aData: [{ x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: -108, y: -92, posScale: 1 }, { x: 110, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: 110, y: 94, posScale: 1 }, { x: 324, y: 94, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 110, y: 280, posScale: 1 }] }, { aData: [{ x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: -322, y: -92, posScale: 1 }, { x: 110, y: -92, posScale: 1 }, { x: 324, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: 324, y: 94, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 110, y: 280, posScale: 1 }] }, { aData: [{ x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: 324, y: -278, posScale: 1 }, { x: 110, y: -92, posScale: 1 }, { x: 324, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: -322, y: 280, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 110, y: 280, posScale: 1 }] }, { aData: [{ x: 110, y: -278, posScale: 1 }, { x: -322, y: -92, posScale: 1 }, { x: -108, y: -92, posScale: 1 }, { x: 110, y: -92, posScale: 1 }, { x: 324, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: 110, y: 94, posScale: 1 }, { x: 324, y: 94, posScale: 1 }, { x: -108, y: 280, posScale: 1 }] }, { aData: [{ x: -322, y: -278, posScale: 1 }, { x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: -108, y: -92, posScale: 1 }, { x: 110, y: -92, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: 110, y: 94, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 110, y: 280, posScale: 1 }, { x: 324, y: 280, posScale: 1 }] }, { aData: [{ x: -322, y: -278, posScale: 1 }, { x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: 324, y: -278, posScale: 1 }, { x: -108, y: -92, posScale: 1 }, { x: 110, y: 94, posScale: 1 }, { x: -322, y: 280, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 110, y: 280, posScale: 1 }, { x: 324, y: 280, posScale: 1 }] }, { aData: [{ x: -108, y: -278, posScale: 1 }, { x: 324, y: -278, posScale: 1 }, { x: -322, y: -92, posScale: 1 }, { x: -108, y: -92, posScale: 1 }, { x: 324, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: 324, y: 94, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 324, y: 280, posScale: 1 }] }, { aData: [{ x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: -322, y: -92, posScale: 1 }, { x: -108, y: -92, posScale: 1 }, { x: 324, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: 110, y: 94, posScale: 1 }, { x: 324, y: 94, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 110, y: 280, posScale: 1 }] }, { aData: [{ x: -322, y: -278, posScale: 1 }, { x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: -322, y: -92, posScale: 1 }, { x: 324, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: 110, y: 94, posScale: 1 }, { x: -322, y: 280, posScale: 1 }, { x: 324, y: 280, posScale: 1 }] }, { aData: [{ x: -108, y: -278, posScale: 1 }, { x: 110, y: -278, posScale: 1 }, { x: -108, y: -92, posScale: 1 }, { x: 110, y: -92, posScale: 1 }, { x: 324, y: -92, posScale: 1 }, { x: -322, y: 94, posScale: 1 }, { x: -108, y: 94, posScale: 1 }, { x: 110, y: 94, posScale: 1 }, { x: -108, y: 280, posScale: 1 }, { x: 110, y: 280, posScale: 1 }] });
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
    initStartScreen();
}
function initStartScreen() {
    gameState = "start";
    userInput.removeHitArea("moreGames");
    if (audioType == 1) {
        music.fade(music.volume(), .25, 100);
    }
    background = new Elements.Background(0);
    var oPlayBut = { oImgData: assetLib.getData("uiButs"), aPos: [0, 0], align: [.5, .8], id: oImageIds.playBut, idOver: oImageIds.playButOver, flash: true };
    var oInfoBut = { oImgData: assetLib.getData("uiButs"), aPos: [65, 65], align: [0, 0], id: oImageIds.infoBut, idOver: oImageIds.infoButOver };
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
        var oMuteBut = { oImgData: assetLib.getData("uiButs"), aPos: [-65, 65], align: [1, 0], id: mb, idOver: mbOver };
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
    var oBackBut = { oImgData: assetLib.getData("uiButs"), aPos: [65, 65], align: [0, 0], id: oImageIds.backBut, idOver: oImageIds.backButOver };
    userInput.addHitArea("backFromCredits", butEventHandler, null, "image", oBackBut);
    var aButs = new Array(oBackBut);
    addMuteBut(aButs);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    background.changeBg(5);
    previousTime = new Date().getTime();
    updateCreditsScreenEvent();
}
function initGame() {
    gameState = "game";
    if (audioType == 1) {
        music.fade(music.volume(), .5, 1000);
    }
    playSound("levelStart");
    score = 0;
    levelNum = 0;
    chainCount = 0;
    runTimer = false;
    gameBgId = (gameBgId + 1) % 6;
    background.changeBg(gameBgId);
    cards = new Elements.Cards(aCardPos[levelNum].aData);
    var oBackBut = { oImgData: assetLib.getData("uiButs"), aPos: [65, 65], align: [0, 0], id: oImageIds.backBut, idOver: oImageIds.backButOver };
    userInput.addHitArea("backFromGame", butEventHandler, null, "image", oBackBut);
    var aButs = new Array(oBackBut);
    panel = new Elements.Panel(gameState, aButs);
    addMuteBut(aButs);
    panel.startTween1();
    userInput.addHitArea("hitPlayArea", butEventHandler, null, "rect", { aRect: [0, 0, canvas.width, canvas.height] }, true);
    aParticles = new Array();
    previousTime = new Date().getTime();
    updateGameEvent();
}
function initGameOver() {
    gameState = "gameOver";
    if (audioType == 1) {
        music.fade(music.volume(), .25, 500);
    }
    saveDataHandler.setData(gameType, score);
    saveDataHandler.saveData();
    if (this.popCharTween) {
        this.popCharTween.kill();
    }
    if (this.plusTween) {
        this.plusTween.kill();
    }
    playSound("gameOver");
    background = new Elements.Background(0);
    aFireworks = new Array();
    var oBackBut = { oImgData: assetLib.getData("uiButs"), aPos: [45, 45], align: [0, 0], id: oImageIds.backBut, idOver: oImageIds.backButOver };
    var oReplayBut = { oImgData: assetLib.getData("uiButs"), aPos: [-90, -80], align: [1, .9], id: oImageIds.replayBut, idOver: oImageIds.replayButOver, flash: true };
    userInput.addHitArea("backFromGameOver", butEventHandler, null, "image", oBackBut);
    userInput.addHitArea("replayFromGameOver", butEventHandler, null, "image", oReplayBut);
    var aButs = new Array(oBackBut, oReplayBut);
    panel = new Elements.Panel(gameState, aButs);
    addMuteBut(aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    updateGameOverEvent();
}
function initPause() {
    gameState = "pause";
    for (var i = 0; i < cards.aLevelCards.length; i++) {
        if (cards.aLevelCards[i].tween) {
            cards.aLevelCards[i].tween.pause();
        }
    }
    var oQuitBut = { oImgData: assetLib.getData("uiButs"), aPos: [0, 80], align: [.5, .5], id: oImageIds.quitBut, idOver: oImageIds.quitButOver, flash: true };
    var oRestartBut = { oImgData: assetLib.getData("uiButs"), aPos: [0, -80], align: [.5, .5], id: oImageIds.continueBut, idOver: oImageIds.continueButOver, flash: true };
    userInput.addHitArea("quitGame", butEventHandler, null, "image", oQuitBut);
    userInput.addHitArea("resumeGame", butEventHandler, null, "image", oRestartBut);
    var aButs = new Array(oQuitBut, oRestartBut);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    background = new Elements.Background(gameBgId);
    updatePauseEvent();
}
function resumeGame() {
    gameState = "game";
    for (var i = 0; i < cards.aLevelCards.length; i++) {
        if (cards.aLevelCards[i].tween) {
            cards.aLevelCards[i].tween.play();
        }
    }
    background = new Elements.Background(gameBgId);
    var oPauseBut = { oImgData: assetLib.getData("uiButs"), aPos: [45, 45], align: [0, 0], id: oImageIds.pauseBut, idOver: oImageIds.pauseButOver };
    userInput.addHitArea("pause", butEventHandler, null, "image", oPauseBut);
    var aButs = new Array(oPauseBut);
    panel = new Elements.Panel(gameState, aButs);
    addMuteBut(aButs);
    panel.startTween1();
    userInput.addHitArea("hitPlayArea", butEventHandler, null, "rect", { aRect: [0, 0, canvas.width, canvas.height] }, true);
    previousTime = new Date().getTime();
    updateGameEvent();
}
function butEventHandler(_id, _oData) {
    switch (_id) {
        case "langSelect":
            break;
        case "credits":
            playSound("click");
            userInput.removeHitArea("startGame0");
            userInput.removeHitArea("startGame1");
            userInput.removeHitArea("startGame2");
            userInput.removeHitArea("bioFromStart");
            userInput.removeHitArea("credits");
            userInput.removeHitArea("mute");
            initCreditsScreen();
            break;
        case "backFromCredits":
            playSound("click");
            userInput.removeHitArea("backFromCredits");
            userInput.removeHitArea("resetData");
            userInput.removeHitArea("mute");
            initStartScreen();
            break;
        case "moreGames":
        case "moreGamesPause":
            break;
        case "resetData":
            playSound("click");
            userInput.removeHitArea("backFromCredits");
            userInput.removeHitArea("resetData");
            userInput.removeHitArea("mute");
            firstRun = true;
            saveDataHandler.resetData();
            initStartScreen();
            break;
        case "startGame":
            playSound("click");
            userInput.removeHitArea("startGame");
            userInput.removeHitArea("credits");
            userInput.removeHitArea("mute");
            gameType = 0;
            initGame();
            break;
        case "hitPlayArea":
            var aCardData = aCardPos[levelNum].aData;
            var canHit;
            var bWidth = (cards.width / 2) * cards.waitScale;
            var bHeight = (cards.height / 2) * cards.waitScale;
            for (var i = 0; i < aCardData.length; i++) {
                if (_oData.x < canvas.width / 2 + aCardData[i].x * cards.stretchX + bWidth * aCardData[i].posScale
                    && _oData.x > canvas.width / 2 + aCardData[i].x * cards.stretchX - bWidth * aCardData[i].posScale
                    && _oData.y < canvas.height / 2 + aCardData[i].y * cards.stretchY + bHeight * aCardData[i].posScale + gameAreaOffsetY
                    && _oData.y > canvas.height / 2 + aCardData[i].y * cards.stretchY - bHeight * aCardData[i].posScale + gameAreaOffsetY) {
                    canHit = true;
                    for (var j = 0; j < cards.aFlippedCards.length; j++) {
                        if (cards.aFlippedCards[j] == i || cards.aFlippedCards.length > 1) {
                            canHit = false;
                            break;
                        }
                    }
                    if (cards.aLevelCards[i].isFlipped) {
                        canHit = false;
                    }
                    if (canHit) {
                        cardHit(i);
                        break;
                    }
                }
            }
            break;
        case "backFromGameOver":
            playSound("click");
            userInput.removeHitArea("backFromGameOver");
            userInput.removeHitArea("replayFromGameOver");
            userInput.removeHitArea("mute");
            initStartScreen();
            break;
        case "replayFromGameOver":
            playSound("click");
            userInput.removeHitArea("backFromGameOver");
            userInput.removeHitArea("replayFromGameOver");
            userInput.removeHitArea("mute");
            initGame();
            break;
        case "mute":
            playSound("click");
            toggleMute();
            panel.aButs.pop();
            addMuteBut(panel.aButs);
            break;
        case "pause":
            playSound("click");
            if (audioType == 1) {
                Howler.mute(true);
            }
            else if (audioType == 2) {
                music.pause();
            }
            userInput.removeHitArea("pause");
            userInput.removeHitArea("hitPlayArea");
            userInput.removeHitArea("mute");
            initPause();
            break;
        case "backFromGame":
            userInput.removeHitArea("backFromGame");
            userInput.removeHitArea("hitPlayArea");
            userInput.removeHitArea("mute");
            for (var i = 0; i < cards.aLevelCards.length; i++) {
                if (cards.aLevelCards[i].tween) {
                    cards.aLevelCards[i].tween.kill();
                }
            }
            initStartScreen();
            break;
        case "resumeGame":
            playSound("click");
            if (audioType == 1) {
                if (!muted) {
                    Howler.mute(false);
                }
            }
            else if (audioType == 2) {
                if (!muted) {
                    playMusic();
                }
            }
            userInput.removeHitArea("quitGame");
            userInput.removeHitArea("resumeGame");
            userInput.removeHitArea("restartGame");
            userInput.removeHitArea("mute");
            resumeGame();
            break;
        case "quitGame":
            playSound("click");
            if (audioType == 1) {
                if (!muted) {
                    Howler.mute(false);
                }
            }
            else if (audioType == 2) {
                if (!muted) {
                    playMusic();
                }
            }
            userInput.removeHitArea("quitGame");
            userInput.removeHitArea("resumeGame");
            userInput.removeHitArea("restartGame");
            userInput.removeHitArea("mute");
            initStartScreen();
            break;
    }
}
function cardMatch(_id) {
    for (var i = 0; i < 5; i++) {
    }
    chainCount++;
    playSound("match" + Math.min(chainCount - 1, 4));
    score += 1;
    if (score > 999) {
        score = 999;
    }
    panel.jiggleScore();
    panel.particleBlast();
}
function cardHit(_cardId) {
    cards.flipStart(_cardId);
    if (cards.aFlippedCards.length == 2) {
        runTimer = false;
    }
    if (cards.aFlippedCards.length == 1) {
        playSound("card0");
    }
    else {
        playSound("card1");
    }
}
function initLevelComplete() {
    levelNum++;
    firstRun = false;
    playSound("levelStart");
    if (levelNum > 24) {
        levelNum = 13;
    }
    curTime += 300;
    curTime = Math.min(curTime, 18000);
    if (score > 999) {
        score = 999;
    }
    panel.jiggleScore();
    panel.curtainIn();
    livesNum = Math.min(livesNum + 1, 5);
    cards = new Elements.Cards(aCardPos[levelNum].aData);
    gameBgId = (gameBgId + 1) % 6;
    background.changeBg(gameBgId);
    if (gameType == 1) {
        saveDataHandler.setData(gameType, score);
        saveDataHandler.saveData();
    }
    for (var i = 0; i < 5; i++) {
    }
}
function updateGameEvent() {
    if (gameState != "game") {
        return;
    }
    if (canvas.width > canvas.height * .95) {
        gameAreaOffsetY = 40;
    }
    else {
        gameAreaOffsetY = 0;
    }
    delta = getDelta();
    if (gameType == 0 && runTimer) {
        curTime = Math.max(Math.round(curTime - (delta * 100)), 0);
        if (curTime <= 0) {
            userInput.removeHitArea("pause");
            userInput.removeHitArea("hitPlayArea");
            userInput.removeHitArea("mute");
            runTimer = false;
            initGameOver();
        }
    }
    background.render();
    panel.update();
    panel.render();
    cards.update();
    cards.render();
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
function updateGameOverEvent() {
    if (gameState != "gameOver") {
        return;
    }
    delta = getDelta();
    if (Math.random() < .1) {
    }
    background.render();
    for (var i = 0; i < aFireworks.length; i++) {
        aFireworks[i].update();
        aFireworks[i].render(ctx);
        if (aFireworks[i].removeMe) {
            aFireworks.splice(i, 1);
            i -= 1;
        }
    }
    panel.update();
    panel.render();
    checkButtonsOver();
    requestAnimFrame(updateGameOverEvent);
}
function updateCreditsScreenEvent() {
    if (gameState != "credits") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.font = "15px Helvetica";
    ctx.fillText("v0.0.4", 10, canvas.height - 10);
    checkButtonsOver();
    requestAnimFrame(updateCreditsScreenEvent);
}
function updateBioScreenEvent() {
    if (gameState != "bio") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    for (var i = 0; i < aFireworks.length; i++) {
        aFireworks[i].update();
        aFireworks[i].render(ctx);
        if (aFireworks[i].removeMe) {
            aFireworks.splice(i, 1);
            i -= 1;
        }
    }
    checkButtonsOver();
    requestAnimFrame(updateBioScreenEvent);
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
    assetLib = new Utils.AssetLoader(curLang, [{
            id: "splashLogo",
            file: "images/info.png"
        }, {
            id: "bg0",
            file: "images/bg0.jpg"
        }, {
            id: "bg1",
            file: "images/bg1.jpg"
        }, {
            id: "bg2",
            file: "images/bg2.jpg"
        }, {
            id: "bg3",
            file: "images/bg3.jpg"
        }, {
            id: "bg4",
            file: "images/bg4.jpg"
        }, {
            id: "bg5",
            file: "images/bg5.jpg"
        }, {
            id: "uiButs",
            file: "images/uiButs.png",
            oAtlasData: {
                id0: { x: 229, y: 216, width: 109, height: 106 },
                id1: { x: 340, y: 216, width: 109, height: 106 },
                id2: { x: 340, y: 108, width: 109, height: 106 },
                id3: { x: 340, y: 0, width: 109, height: 106 },
                id4: { x: 229, y: 324, width: 109, height: 106 },
                id5: { x: 340, y: 324, width: 109, height: 106 },
                id6: { x: 0, y: 0, width: 227, height: 222 },
                id7: { x: 0, y: 224, width: 227, height: 222 },
                id8: { x: 229, y: 108, width: 109, height: 106 },
                id9: { x: 229, y: 0, width: 109, height: 106 }
            }
        }, {
            id: "uiElements",
            file: "images/uiElements.png",
            oAtlasData: {
                id0: { x: 0, y: 902, width: 900, height: 900 },
                id1: { x: 0, y: 0, width: 900, height: 900 },
                id10: { x: 902, y: 1372, width: 201, height: 171 },
                id11: { x: 902, y: 1029, width: 401, height: 341 },
                id12: { x: 902, y: 1545, width: 201, height: 171 },
                id13: { x: 902, y: 0, width: 401, height: 341 },
                id14: { x: 902, y: 686, width: 401, height: 341 },
                id15: { x: 902, y: 1718, width: 82, height: 79 },
                id2: { x: 1305, y: 692, width: 138, height: 199 },
                id3: { x: 902, y: 343, width: 401, height: 341 },
                id4: { x: 1305, y: 173, width: 201, height: 171 },
                id5: { x: 1305, y: 0, width: 201, height: 171 },
                id6: { x: 1105, y: 1545, width: 201, height: 171 },
                id7: { x: 1105, y: 1372, width: 201, height: 171 },
                id8: { x: 1305, y: 519, width: 201, height: 171 },
                id9: { x: 1305, y: 346, width: 201, height: 171 }
            }
        }, {
            id: "cards",
            file: "images/cards_360x300.jpg"
        }, {
            id: "scoreNumbers",
            file: "images/numbers_66x84.png"
        }, {
            id: "titleLogo",
            file: "images/title/" + curLang + ".png"
        }, {
            id: "showLogo",
            file: "images/logo.png"
        }, {
            id: "cardLogo",
            file: "images/cardLogo.png"
        }, {
            id: "langText",
            file: "json/text.json"
        }], ctx, canvas.width, canvas.height);
    oImageIds.curtain0 = "id0";
    oImageIds.curtain1 = "id1";
    oImageIds.finger = "id2";
    oImageIds.cardFront = "id3";
    oImageIds.cardBack1 = "id4";
    oImageIds.cardBack2 = "id5";
    oImageIds.cardBack3 = "id6";
    oImageIds.cardBack4 = "id7";
    oImageIds.cardBack5 = "id8";
    oImageIds.cardBack0 = "id9";
    oImageIds.cardUnder00 = "id10";
    oImageIds.cardUnder01 = "id11";
    oImageIds.cardUnder10 = "id12";
    oImageIds.cardUnder11 = "id13";
    oImageIds.introCard = "id14";
    oImageIds.cup = "id15";
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
            userInput.addHitArea("hitPlayArea", butEventHandler, null, "rect", { aRect: [0, 0, canvas.width, canvas.height] }, true);
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
function playSound(_id) {
    if (audioType == 1) {
        sound.play(_id);
    }
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
