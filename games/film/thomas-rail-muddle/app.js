var Utils;
(function (Utils) {
    var AssetLoader = (function () {
        function AssetLoader(_lang, _aFileData, _ctx, _canvasWidth, _canvasHeight, _showBar) {
            if (_showBar === void 0) { _showBar = true; }
            this.oAssetData = {};
            this.assetsLoaded = 0;
            this.textData = {};
            this.spinnerRot = 0;
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
            if (_showBar) {
                this.oLoaderImgData = preAssetLib.getData("loader");
                this.oLoadSpinnerImgData = preAssetLib.getData("loadSpinner");
            }
        }
        AssetLoader.prototype.render = function () {
            ctx.fillStyle = "rgba(0, 0, 0, 1)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 + 20, (300 / this.totalAssets) * this.assetsLoaded, 30);
            ctx.drawImage(this.oLoaderImgData.img, canvas.width / 2 - this.oLoaderImgData.img.width / 2, canvas.height / 2 - this.oLoaderImgData.img.height / 2);
            this.spinnerRot += delta * 3;
            ctx.save();
            ctx.translate(canvas.width / 2 - 30, canvas.height / 2 - 16);
            ctx.rotate(this.spinnerRot);
            ctx.drawImage(this.oLoadSpinnerImgData.img, -this.oLoadSpinnerImgData.img.width / 2, -this.oLoadSpinnerImgData.img.height / 2);
            ctx.restore();
            this.displayNumbers();
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
            if (this.assetsLoaded == this.totalAssets) {
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
        function AnimSprite(_oImgData, _fps, _radius, _animId) {
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
            this.oImgData = _oImgData;
            this.oAnims = this.oImgData.oData.oAnims;
            this.fps = _fps;
            this.radius = _radius;
            this.animId = _animId;
            this.centreX = Math.round(this.oImgData.oData.spriteWidth / 2);
            this.centreY = Math.round(this.oImgData.oData.spriteHeight / 2);
        }
        AnimSprite.prototype.updateAnimation = function (_delta) {
            this.frameInc += this.fps * _delta;
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
        AnimSprite.prototype.render = function (_ctx) {
            _ctx.save();
            _ctx.translate(this.x, this.y);
            _ctx.rotate(this.rotation);
            _ctx.scale(this.scaleX, this.scaleY);
            _ctx.globalAlpha = this.alpha;
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
            _ctx.drawImage(this.oImgData.img, imgX, imgY, this.oImgData.oData.spriteWidth, this.oImgData.oData.spriteHeight, -this.centreX + this.offsetX, -this.centreY + this.offsetY, this.oImgData.oData.spriteWidth, this.oImgData.oData.spriteHeight);
            _ctx.restore();
        };
        AnimSprite.prototype.renderSimple = function () {
            if (this.animId != null) {
                var max = this.oAnims[this.animId].length;
                var idx = Math.floor(this.frameInc);
                this.curFrame = this.oAnims[this.animId][idx % max];
                var imgX = (this.curFrame * (this.oImgData.oData.spriteWidth + frameBuffer)) % this.oImgData.img.width;
                var imgY = Math.floor(this.curFrame / (this.oImgData.img.width / (this.oImgData.oData.spriteWidth + frameBuffer))) * (this.oImgData.oData.spriteHeight + frameBuffer);
                if (this.animType == "once") {
                    if (idx > this.maxIdx) {
                        this.fixedFrame = this.oAnims[this.animId][max - 1];
                        this.animId = null;
                        if (this.animEndedFunc != null) {
                            this.animEndedFunc();
                        }
                        var imgX = (this.fixedFrame * (this.oImgData.oData.spriteWidth + frameBuffer)) % this.oImgData.img.width;
                        var imgY = Math.floor(this.fixedFrame / (this.oImgData.img.width / (this.oImgData.oData.spriteWidth + frameBuffer))) * (this.oImgData.oData.spriteHeight + frameBuffer);
                    }
                }
            }
            else {
                var imgX = (this.fixedFrame * (this.oImgData.oData.spriteWidth + frameBuffer)) % this.oImgData.img.width;
                var imgY = Math.floor(this.fixedFrame / (this.oImgData.img.width / (this.oImgData.oData.spriteWidth + frameBuffer))) * (this.oImgData.oData.spriteHeight + frameBuffer);
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
                playSound("silence", .3);
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
            if (!isMobile && gameState == "game" && railTiles && train.solvedState == 0) {
                railTiles.overCheck(this.mouseX, this.mouseY);
            }
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
            this.renderState = null;
            this.oBgMain0ImgData = assetLib.getData("bgMain" + zoneNum + "b");
            this.oBgMain1ImgData = assetLib.getData("bgMain" + zoneNum + "a");
            this.oBgTitleImgData = assetLib.getData("bgTitle");
        }
        Background.prototype.render = function () {
            if (gameState == "game") {
                if (canvas.width > canvas.height) {
                    ctx.drawImage(this.oBgMain0ImgData.img, 0, 0, this.oBgMain0ImgData.img.width, this.oBgMain0ImgData.img.height, railTiles.windowWidth + railTiles.buffer * 2, 0, canvas.width, canvas.height);
                }
                else {
                    ctx.drawImage(this.oBgMain0ImgData.img, 0, 0, this.oBgMain0ImgData.img.width, this.oBgMain0ImgData.img.height, 0, railTiles.windowHeight + railTiles.windowOffsetY + railTiles.buffer * 2, canvas.width, canvas.height);
                }
            }
            else if (gameState == "start") {
                this.inc += 2 * delta;
                var temp = 1.06 + (Math.sin(this.inc)) * .03;
                if (canvas.width > canvas.height) {
                    ctx.drawImage(this.oBgTitleImgData.img, 0, ((1 - canvas.height / canvas.width) * .65) * this.oBgTitleImgData.img.height, this.oBgTitleImgData.img.width, (canvas.height / canvas.width) * this.oBgTitleImgData.img.height, 0 - (canvas.width * (temp - 1)) / 2, 0 - (canvas.height * (temp - 1)) / 2, canvas.width * temp, canvas.height * temp);
                }
                else {
                    ctx.drawImage(this.oBgTitleImgData.img, ((1 - canvas.width / canvas.height) * .65) * this.oBgTitleImgData.img.width, 0, (canvas.width / canvas.height) * this.oBgTitleImgData.img.width, this.oBgTitleImgData.img.width, 0 - (canvas.width * (temp - 1)) / 2, 0 - (canvas.height * (temp - 1)) / 2, canvas.width * temp, canvas.height * temp);
                }
            }
            else if (gameState == "credits" || gameState == "intro" || gameState == "outro") {
                this.inc += 2 * delta;
                var temp = 1.06 + (Math.sin(this.inc)) * .03;
                if (canvas.width > canvas.height) {
                    ctx.drawImage(this.oBgTitleImgData.img, 0, ((1 - canvas.height / canvas.width) * .65) * this.oBgTitleImgData.img.height, this.oBgTitleImgData.img.width, (canvas.height / canvas.width) * this.oBgTitleImgData.img.height, 0 - (canvas.width * (temp - 1)) / 2, 0 - (canvas.height * (temp - 1)) / 2, canvas.width * temp, canvas.height * temp);
                }
                else {
                    ctx.drawImage(this.oBgTitleImgData.img, ((1 - canvas.width / canvas.height) * .65) * this.oBgTitleImgData.img.width, 0, (canvas.width / canvas.height) * this.oBgTitleImgData.img.width, this.oBgTitleImgData.img.width, 0 - (canvas.width * (temp - 1)) / 2, 0 - (canvas.height * (temp - 1)) / 2, canvas.width * temp, canvas.height * temp);
                }
            }
        };
        Background.prototype.renderUIBg = function () {
            if (canvas.width > canvas.height) {
                ctx.drawImage(this.oBgMain1ImgData.img, 0, 0, this.oBgMain1ImgData.img.width, this.oBgMain1ImgData.img.height, 0, 0, railTiles.windowWidth + railTiles.buffer * 2, canvas.height);
            }
            else {
                ctx.drawImage(this.oBgMain1ImgData.img, 0, 0, this.oBgMain1ImgData.img.width, this.oBgMain1ImgData.img.height, 0, 0, canvas.width, railTiles.windowHeight + railTiles.windowOffsetY + railTiles.buffer * 2);
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
            this.numberSpace = 17;
            this.incY = 0;
            this.flareRot = 0;
            this.travellingInc = 0;
            this.aIntroBgCols = new Array("rgba(124, 38, 15, 0.75)", "rgba(15, 43, 124, 0.75)", "rgba(41, 124, 15, 0.75)", "rgba(74, 30, 117, 0.75)");
            this.aIntroTextCols = new Array("#EF7023", "#00A0DF", "#3DAE2B", "#9264CC");
            this.oSplashLogoImgData = assetLib.getData("splashLogo");
            this.oUiElementsImgData = assetLib.getData("uiElements");
            this.oGameElementsImgData = assetLib.getData("gameElements");
            this.panelType = _panelType;
            this.aButs = _aButs;
            this.oTopFlareImgData = assetLib.getData("flare");
            this.oTitleLogoImgData = assetLib.getData("titleLogo");
        }
        Panel.prototype.update = function () {
            this.incY += 10 * delta;
        };
        Panel.prototype.startTween1 = function () {
            this.posY = 500;
            TweenLite.to(this, .5, { posY: 0, ease: "Back.easeOut" });
            this.butsY = 500;
            TweenLite.to(this, .5, { butsY: 0, ease: "Cubic.easeOut" });
        };
        Panel.prototype.introTween = function () {
            var _this = this;
            this.tutY = 500;
            TweenLite.to(this, 1, { tutY: 0, ease: "Back.easeOut" });
            this.iconY = 100;
            TweenLite.to(this, 1, {
                iconY: 0, delay: 1, ease: "Bounce.easeOut",
                onComplete: function () {
                    TweenLite.to(_this, .5, {
                        iconY: 100, delay: 2, ease: "Cubic.easeIn",
                        onComplete: function () {
                        }
                    });
                }
            });
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
        Panel.prototype.roundRect = function (ctx, x, y, width, height, radius, fill, stroke) {
            if (typeof stroke === 'undefined') {
                stroke = true;
            }
            if (typeof radius === 'undefined') {
                radius = 5;
            }
            if (typeof radius === 'number') {
                radius = { tl: radius, tr: radius, br: radius, bl: radius };
            }
            else {
                var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
                for (var side in defaultRadius) {
                    radius[side] = radius[side] || defaultRadius[side];
                }
            }
            ctx.beginPath();
            ctx.moveTo(x + radius.tl, y);
            ctx.lineTo(x + width - radius.tr, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
            ctx.lineTo(x + width, y + height - radius.br);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
            ctx.lineTo(x + radius.bl, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
            ctx.lineTo(x, y + radius.tl);
            ctx.quadraticCurveTo(x, y, x + radius.tl, y);
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
                    var tempScale = Math.min(canvas.width / this.oTitleLogoImgData.img.width, 1.3);
                    ctx.drawImage(this.oTitleLogoImgData.img, 0, 0, this.oTitleLogoImgData.img.width, this.oTitleLogoImgData.img.height, 0, Math.max(canvas.height * .2 - (this.oTitleLogoImgData.img.height / 2) * tempScale, -50) + this.posY + Math.sin(this.incY * .5) * 10, this.oTitleLogoImgData.img.width * tempScale, this.oTitleLogoImgData.img.height * tempScale);
                    var oShowLogoImgData = assetLib.getData("showLogo");
                    tempScale = 1;
                    ctx.drawImage(oShowLogoImgData.img, 0, 0, oShowLogoImgData.img.width, oShowLogoImgData.img.height, canvas.width - oShowLogoImgData.img.width - 20, 20, oShowLogoImgData.img.width * tempScale, oShowLogoImgData.img.height * tempScale);
                    break;
                case "credits":
                    ctx.fillStyle = this.aIntroBgCols[1];
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(this.oSplashLogoImgData.img, canvas.width / 2 - this.oSplashLogoImgData.img.width / 2, canvas.height / 2 - this.oSplashLogoImgData.img.height / 2 - this.posY);
                    addText(1, 30, 1000, "center", canvas.width / 2, canvas.height / 2 - 175 - this.posY, "producedFor", "#FFFFFF");
                    addText(1, 30, 1000, "center", canvas.width / 2, canvas.height / 2 + 100 - this.posY, "createdBy", "#FFFFFF");
                    break;
                case "intro":
                    ctx.fillStyle = this.aIntroBgCols[zoneNum];
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    this.flareRot += delta / 3;
                    var heightPerc = .6;
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height * heightPerc + this.posY);
                    ctx.rotate(this.flareRot);
                    ctx.scale(2, 2);
                    ctx.drawImage(this.oTopFlareImgData.img, -this.oTopFlareImgData.img.width / 2, -this.oTopFlareImgData.img.height / 2);
                    ctx.translate(-(canvas.width / 2), -(canvas.height * heightPerc + this.posY));
                    ctx.translate(canvas.width / 2, canvas.height * heightPerc + this.posY);
                    ctx.rotate(-this.flareRot * 2);
                    ctx.drawImage(this.oTopFlareImgData.img, -this.oTopFlareImgData.img.width / 2, -this.oTopFlareImgData.img.height / 2);
                    ctx.restore();
                    var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds["zoom" + zoneNum]].x;
                    var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds["zoom" + zoneNum]].y;
                    var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds["zoom" + zoneNum]].width;
                    var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds["zoom" + zoneNum]].height;
                    ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 - bWidth / 2 + Math.sin(this.incY) * 10, canvas.height * .6 - bHeight / 2 + this.posY, bWidth, bHeight);
                    var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].x;
                    var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].y;
                    var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].width;
                    var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].height;
                    ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 - bWidth / 2, canvas.height * .6 - bHeight / 2 - 350 + this.posY / 2, bWidth, bHeight);
                    addText(0, 32, 550, "center", canvas.width / 2, canvas.height * .6 + 5 - 350 + this.posY / 2, "intro" + zoneNum, this.aIntroTextCols[zoneNum]);
                    break;
                case "outro":
                    ctx.fillStyle = this.aIntroBgCols[1];
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    this.flareRot += delta / 3;
                    var heightPerc = .6;
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height * heightPerc + this.posY);
                    ctx.rotate(this.flareRot);
                    ctx.scale(2, 2);
                    ctx.drawImage(this.oTopFlareImgData.img, -this.oTopFlareImgData.img.width / 2, -this.oTopFlareImgData.img.height / 2);
                    ctx.translate(-(canvas.width / 2), -(canvas.height * heightPerc + this.posY));
                    ctx.translate(canvas.width / 2, canvas.height * heightPerc + this.posY);
                    ctx.rotate(-this.flareRot * 2);
                    ctx.drawImage(this.oTopFlareImgData.img, -this.oTopFlareImgData.img.width / 2, -this.oTopFlareImgData.img.height / 2);
                    ctx.restore();
                    var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.zoom4].x;
                    var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.zoom4].y;
                    var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.zoom4].width;
                    var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.zoom4].height;
                    ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 - bWidth / 2, canvas.height * .5 - bHeight / 2 + this.posY, bWidth, bHeight);
                    var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].x;
                    var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].y;
                    var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].width;
                    var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].height;
                    ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 - bWidth / 2, canvas.height * .5 - bHeight / 2 - 185 + this.posY / 2, bWidth, bHeight);
                    ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, canvas.width / 2 - bWidth / 2, canvas.height * .5 - bHeight / 2 + 220 + this.posY / 2, bWidth, bHeight);
                    addText(0, 32, 550, "center", canvas.width / 2, canvas.height * .5 + 5 - 185 + this.posY / 2, "end0", this.aIntroTextCols[0]);
                    addText(0, 32, 550, "center", canvas.width / 2, canvas.height * .5 + 5 + 220 + this.posY / 2, "end1", this.aIntroTextCols[1]);
                    break;
                case "gameOver":
                    break;
                case "game":
                    var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.cloud].x;
                    var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.cloud].y;
                    var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.cloud].width;
                    var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.cloud].height;
                    for (var i = 0; i < railTiles.aCloudData[levelNum].length; i++) {
                        ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale + railTiles.aCloudData[levelNum][i].x * railTiles.scale - bWidth / 2 * railTiles.scale + Math.sin(this.incY * .1 + i) * 10, railTiles.y + (railTiles.tileHeight * 2.5) * railTiles.scale + railTiles.aCloudData[levelNum][i].y * railTiles.scale - bHeight / 2 * railTiles.scale + Math.sin(this.incY * .05 + i) * 10, bWidth * railTiles.scale, bHeight * railTiles.scale);
                    }
                    background.renderUIBg();
                    if (train.solvedState == 1) {
                        this.travellingInc += delta;
                    }
                    ctx.save();
                    this.roundRect(ctx, railTiles.windowX, railTiles.windowY, railTiles.windowWidth, railTiles.windowHeight, 50, true, false);
                    var uiBgData = assetLib.getData("uiBg" + zoneNum);
                    ctx.drawImage(uiBgData.img, 0, 0, uiBgData.img.width, uiBgData.img.height, railTiles.windowX + railTiles.windowWidth / 2 - uiBgData.img.width / 2, railTiles.windowY + railTiles.windowHeight / 2 - uiBgData.img.height / 2 + Math.sin(this.travellingInc * 12) * 5, uiBgData.img.width, uiBgData.img.height);
                    ctx.restore();
                    var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds["signPanel" + zoneNum]].x;
                    var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds["signPanel" + zoneNum]].y;
                    var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds["signPanel" + zoneNum]].width;
                    var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds["signPanel" + zoneNum]].height;
                    ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, railTiles.windowX + railTiles.windowWidth / 2 - bWidth / 2, railTiles.windowY + railTiles.windowHeight - bHeight / 2 + this.posY, bWidth, bHeight);
                    addText(0, 35, 230, "center", railTiles.windowX + railTiles.windowWidth / 2, railTiles.windowY + railTiles.windowHeight + this.posY + 6, "name" + zoneNum, "#FFFFFF");
                    var tempX;
                    var tempY;
                    if (canvas.width > canvas.height) {
                        tempX = railTiles.windowWidth + railTiles.buffer * 2 - 193;
                        tempY = 38;
                    }
                    else {
                        tempX = canvas.width / 2 - 56;
                        tempY = 38;
                    }
                    addText(1, 30, 100, "center", tempX, tempY - this.butsY, "level", "#FFFFFF");
                    addText(1, 30, 100, "center", tempX + 113, tempY - this.butsY, "score", "#FFCD00");
                    var temp = (levelNum + 1).toString();
                    while (temp.length < 2) {
                        temp = "0" + temp;
                    }
                    addDirectText(0, 40, 100, "center", tempX, (tempY + 42) - this.butsY, temp, "#FFFFFF");
                    var temp = totalScore.toString();
                    while (temp.length < 4) {
                        temp = "0" + temp;
                    }
                    addDirectText(0, 40, 100, "center", tempX + 113, (tempY + 42) - this.butsY, temp, "#FFCD00");
                    if (levelNum == 0) {
                        if (train.solvedState < 1) {
                            var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.focus].x;
                            var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.focus].y;
                            var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.focus].width;
                            var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.focus].height;
                            ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale - bWidth / 2 * railTiles.scale, railTiles.y + (railTiles.tileHeight * 2.5) * railTiles.scale - bHeight / 2 * railTiles.scale, bWidth * railTiles.scale, bHeight * railTiles.scale);
                            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                            ctx.fillRect(0, 0, railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale - bWidth / 2 * railTiles.scale, canvas.height);
                            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                            ctx.fillRect(railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale + bWidth / 2 * railTiles.scale, 0, canvas.width, canvas.height);
                            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                            ctx.fillRect(railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale - bWidth / 2 * railTiles.scale, 0, bWidth * railTiles.scale, railTiles.y + (railTiles.tileHeight * 2.5) * railTiles.scale - bHeight / 2 * railTiles.scale);
                            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                            ctx.fillRect(railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale - bWidth / 2 * railTiles.scale, railTiles.y + (railTiles.tileHeight * 2.5) * railTiles.scale + bHeight / 2 * railTiles.scale, bWidth * railTiles.scale, canvas.height);
                        }
                        var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].x;
                        var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].y;
                        var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].width;
                        var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].height;
                        ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale - bWidth / 2 * railTiles.scale, railTiles.y + (railTiles.tileHeight * 1) * railTiles.scale - bHeight / 2 * railTiles.scale - this.tutY, bWidth * railTiles.scale, bHeight * railTiles.scale);
                        if (train.solvedState < 1) {
                            var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.arrow1].x;
                            var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.arrow1].y;
                            var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.arrow1].width;
                            var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.arrow1].height;
                            ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale - bWidth / 2 * railTiles.scale, railTiles.y + (railTiles.tileHeight * 1 + 100 + Math.sin(this.incY * .5) * 15) * railTiles.scale - bHeight / 2 * railTiles.scale - this.tutY, bWidth * railTiles.scale, bHeight * railTiles.scale);
                            addText(1, 32 * railTiles.scale, 550 * railTiles.scale, "center", railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale, railTiles.y + (railTiles.tileHeight * 1 + 4) * railTiles.scale - this.tutY, "tut0", "#002E6D");
                        }
                        else {
                            addText(1, 32 * railTiles.scale, 550 * railTiles.scale, "center", railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale, railTiles.y + (railTiles.tileHeight * 1 + 4) * railTiles.scale - this.tutY, "encourage0", "#002E6D");
                        }
                    }
                    else if (levelNum == 1) {
                        var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].x;
                        var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].y;
                        var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].width;
                        var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.tutPanel].height;
                        ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale - bWidth / 2 * railTiles.scale, railTiles.y + (railTiles.tileHeight * 1) * railTiles.scale - bHeight / 2 * railTiles.scale - this.tutY, bWidth * railTiles.scale, bHeight * railTiles.scale);
                        if (train.solvedState < 1) {
                            var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.arrow1].x;
                            var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.arrow1].y;
                            var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.arrow1].width;
                            var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.arrow1].height;
                            ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, railTiles.x + (railTiles.tileWidth * 2.5 + 80) * railTiles.scale - bWidth / 2 * railTiles.scale, railTiles.y + (railTiles.tileHeight * 1 + 100 + Math.sin(this.incY * .5) * 15) * railTiles.scale - bHeight / 2 * railTiles.scale - this.tutY, bWidth * railTiles.scale, bHeight * railTiles.scale);
                            addText(1, 32 * railTiles.scale, 550 * railTiles.scale, "center", railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale, railTiles.y + (railTiles.tileHeight * 1 + 4) * railTiles.scale - this.tutY, "tut1", "#002E6D");
                        }
                        else {
                            addText(1, 32 * railTiles.scale, 550 * railTiles.scale, "center", railTiles.x + (railTiles.tileWidth * 2.5) * railTiles.scale, railTiles.y + (railTiles.tileHeight * 1 + 4) * railTiles.scale - this.tutY, "encourage1", "#002E6D");
                        }
                    }
                    if (this.iconY < 100) {
                        var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds["icon" + zoneNum]].x;
                        var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds["icon" + zoneNum]].y;
                        var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds["icon" + zoneNum]].width;
                        var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds["icon" + zoneNum]].height;
                        var tx = railTiles.x + (railTiles.endTileIndex % 5) * railTiles.tileWidth * railTiles.scale + (railTiles.tileWidth / 2) * railTiles.scale;
                        var ty = railTiles.y + Math.floor(railTiles.endTileIndex / 5) * railTiles.tileHeight * railTiles.scale + (railTiles.tileHeight / 2 - 40) * railTiles.scale;
                        ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, tx - bWidth / 2 * ((100 - this.iconY) / 100), ty - bHeight / 2 * ((100 - this.iconY) / 100) - this.iconY, bWidth * ((100 - this.iconY) / 100), bHeight * ((100 - this.iconY) / 100));
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
                    ctx.save();
                    ctx.translate(aX + this.aButs[i].aPos[0], aY + this.aButs[i].aPos[1]);
                    ctx.scale(1 + floatY / 30, 1 + floatY / 30);
                    ctx.globalAlpha = 1;
                    ctx.rotate(this.incY / 7);
                    ctx.drawImage(this.oTopFlareImgData.img, -this.oTopFlareImgData.img.width / 2, -this.oTopFlareImgData.img.height / 2);
                    ctx.restore();
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
    var RailTiles = (function () {
        function RailTiles() {
            this.tileWidth = 150;
            this.tileHeight = 150;
            this.uiMinWidth = 450;
            this.uiMaxWidth = 600;
            this.uiMinHeight = 450;
            this.uiMaxHeight = 600;
            this.windowOffsetY = 100;
            this.buffer = 25;
            this.inc = 0;
            this.aLevelData = new Array([
                { id: 15, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 12, solved: false }, { id: 1, solved: false }, { id: 10, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }
            ], [
                { id: 15, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 12, solved: false }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 1, solved: true }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 7, solved: false }, { id: 17, solved: false }
            ], [
                { id: 17, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 2, solved: true }, { id: 0, solved: true }, { id: 10, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 5, solved: true }, { id: 0, solved: true }, { id: 5, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 12, solved: false }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 17, solved: false }
            ], [
                { id: 18, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 9, solved: false }, { id: 2, solved: true }, { id: 5, solved: false }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 1, solved: true }, { id: 11, solved: false }, { id: 0, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 4, solved: false }, { id: 0, solved: true }, { id: 4, solved: true }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }
            ], [
                { id: 18, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 4, solved: false }, { id: 3, solved: true }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 11, solved: false }, { id: 1, solved: true }, { id: 9, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 3, solved: false }, { id: 4, solved: true }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }
            ], [
                { id: 2, solved: true }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 5, solved: true }, { id: 10, solved: false }, { id: 0, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 1, solved: true }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 11, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }
            ], [
                { id: 16, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 2, solved: true }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 7, solved: false }, { id: 1, solved: true }, { id: 12, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 4, solved: true }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }
            ], [
                { id: 16, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 13, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 3, solved: false }, { id: 0, solved: true }, { id: 4, solved: true }, { id: 16, solved: false }, { id: 2, solved: true }, { id: 4, solved: true }, { id: 16, solved: false }, { id: 9, solved: false }, { id: 17, solved: false }, { id: 2, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 4, solved: true }, { id: 18, solved: false }
            ], [
                { id: 18, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 2, solved: true }, { id: 2, solved: false }, { id: 5, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 4, solved: true }, { id: 7, solved: false }, { id: 1, solved: true }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 2, solved: true }, { id: 3, solved: true }, { id: 5, solved: true }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 11, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }
            ], [
                { id: 15, solved: false }, { id: 2, solved: true }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 3, solved: true }, { id: 12, solved: false }, { id: 4, solved: true }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 1, solved: true }, { id: 8, solved: false }, { id: 0, solved: true }, { id: 4, solved: false }, { id: 18, solved: false }, { id: 0, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 5, solved: true }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }
            ], [
                { id: 15, solved: false }, { id: 2, solved: true }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 17, solved: false }, { id: 2, solved: true }, { id: 4, solved: true }, { id: 12, solved: false }, { id: 3, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 8, solved: false }, { id: 1, solved: false }, { id: 0, solved: true }, { id: 5, solved: false }, { id: 3, solved: false }, { id: 5, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 1, solved: true }, { id: 15, solved: false }, { id: 5, solved: true }, { id: 0, solved: true }, { id: 0, solved: true }, { id: 4, solved: true }
            ], [
                { id: 18, solved: false }, { id: 4, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 3, solved: true }, { id: 2, solved: true }, { id: 5, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 1, solved: true }, { id: 5, solved: true }, { id: 0, solved: true }, { id: 14, solved: false }, { id: 2, solved: true }, { id: 4, solved: true }, { id: 18, solved: false }, { id: 9, solved: false }, { id: 17, solved: false }, { id: 0, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 2, solved: false }, { id: 0, solved: true }, { id: 3, solved: false }, { id: 15, solved: false }
            ], [
                { id: 3, solved: false }, { id: 14, solved: false }, { id: 8, solved: false }, { id: 5, solved: false }, { id: 16, solved: false }, { id: 2, solved: false }, { id: 3, solved: true }, { id: 2, solved: true }, { id: 3, solved: false }, { id: 17, solved: false }, { id: 5, solved: false }, { id: 4, solved: true }, { id: 5, solved: true }, { id: 4, solved: false }, { id: 18, solved: false }, { id: 2, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }
            ], [
                { id: 18, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 5, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 0, solved: false }, { id: 12, solved: false }, { id: 1, solved: false }, { id: 3, solved: false }, { id: 17, solved: false }, { id: 1, solved: true }, { id: 8, solved: false }, { id: 5, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 2, solved: false }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 18, solved: false }
            ], [
                { id: 9, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 0, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 3, solved: false }, { id: 2, solved: false }, { id: 1, solved: true }, { id: 18, solved: false }, { id: 5, solved: false }, { id: 3, solved: false }, { id: 1, solved: true }, { id: 0, solved: false }, { id: 4, solved: false }, { id: 5, solved: false }, { id: 18, solved: false }, { id: 0, solved: false }, { id: 3, solved: false }, { id: 2, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 11, solved: false }
            ], [
                { id: 16, solved: false }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 3, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 5, solved: false }, { id: 4, solved: true }, { id: 1, solved: true }, { id: 2, solved: true }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 16, solved: false }, { id: 0, solved: false }, { id: 4, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 10, solved: false }, { id: 1, solved: true }, { id: 16, solved: false }, { id: 12, solved: false }, { id: 1, solved: false }, { id: 0, solved: true }, { id: 5, solved: false }
            ], [
                { id: 15, solved: false }, { id: 2, solved: true }, { id: 3, solved: true }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 3, solved: false }, { id: 5, solved: false }, { id: 4, solved: false }, { id: 5, solved: false }, { id: 18, solved: false }, { id: 7, solved: false }, { id: 17, solved: false }, { id: 2, solved: true }, { id: 3, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 5, solved: true }, { id: 4, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 12, solved: false }, { id: 3, solved: false }, { id: 18, solved: false }
            ], [
                { id: 13, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 16, solved: false }, { id: 9, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 18, solved: false }, { id: 2, solved: true }, { id: 2, solved: false }, { id: 3, solved: false }, { id: 5, solved: false }, { id: 16, solved: false }, { id: 4, solved: false }, { id: 5, solved: false }, { id: 1, solved: true }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 4, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 0, solved: true }, { id: 3, solved: false }
            ], [
                { id: 17, solved: false }, { id: 16, solved: false }, { id: 13, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 2, solved: false }, { id: 3, solved: true }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 3, solved: false }, { id: 1, solved: false }, { id: 4, solved: true }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 7, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }
            ], [
                { id: 16, solved: false }, { id: 16, solved: false }, { id: 5, solved: false }, { id: 0, solved: true }, { id: 5, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 2, solved: false }, { id: 10, solved: false }, { id: 0, solved: false }, { id: 5, solved: false }, { id: 0, solved: true }, { id: 4, solved: false }, { id: 5, solved: false }, { id: 3, solved: false }, { id: 1, solved: true }, { id: 12, solved: false }, { id: 2, solved: false }, { id: 0, solved: false }, { id: 15, solved: false }, { id: 3, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 15, solved: false }
            ], [
                { id: 15, solved: false }, { id: 18, solved: false }, { id: 3, solved: false }, { id: 0, solved: true }, { id: 4, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 1, solved: true }, { id: 17, solved: false }, { id: 0, solved: false }, { id: 5, solved: false }, { id: 14, solved: false }, { id: 0, solved: false }, { id: 8, solved: false }, { id: 3, solved: false }, { id: 1, solved: true }, { id: 17, solved: false }, { id: 0, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 4, solved: false }, { id: 1, solved: false }, { id: 3, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }
            ], [
                { id: 15, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 3, solved: false }, { id: 5, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 12, solved: false }, { id: 6, solved: false }, { id: 3, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 7, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 17, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }
            ], [
                { id: 12, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 18, solved: false }, { id: 5, solved: false }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 0, solved: false }, { id: 16, solved: false }, { id: 3, solved: false }, { id: 1, solved: false }, { id: 6, solved: false }, { id: 3, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 16, solved: false }, { id: 0, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 2, solved: false }, { id: 1, solved: false }, { id: 10, solved: false }
            ], [
                { id: 15, solved: false }, { id: 3, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 8, solved: false }, { id: 6, solved: false }, { id: 6, solved: false }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 18, solved: false }, { id: 0, solved: false }, { id: 1, solved: true }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 12, solved: false }, { id: 6, solved: false }, { id: 5, solved: false }, { id: 18, solved: false }, { id: 1, solved: true }, { id: 15, solved: false }, { id: 4, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 5, solved: false }
            ], [
                { id: 15, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 3, solved: false }, { id: 2, solved: false }, { id: 15, solved: false }, { id: 3, solved: false }, { id: 5, solved: false }, { id: 4, solved: false }, { id: 6, solved: false }, { id: 1, solved: false }, { id: 6, solved: false }, { id: 3, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 17, solved: false }, { id: 8, solved: false }, { id: 3, solved: false }, { id: 18, solved: false }, { id: 2, solved: false }, { id: 14, solved: false }
            ], [
                { id: 3, solved: false }, { id: 2, solved: false }, { id: 15, solved: false }, { id: 2, solved: true }, { id: 2, solved: false }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 0, solved: true }, { id: 2, solved: false }, { id: 11, solved: false }, { id: 17, solved: false }, { id: 2, solved: false }, { id: 1, solved: false }, { id: 4, solved: false }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 8, solved: false }, { id: 2, solved: false }, { id: 18, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }
            ], [
                { id: 4, solved: false }, { id: 14, solved: false }, { id: 3, solved: false }, { id: 2, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 15, solved: false }, { id: 1, solved: true }, { id: 1, solved: true }, { id: 17, solved: false }, { id: 2, solved: false }, { id: 1, solved: false }, { id: 4, solved: true }, { id: 0, solved: false }, { id: 16, solved: false }, { id: 18, solved: false }, { id: 8, solved: false }, { id: 1, solved: false }, { id: 6, solved: false }, { id: 4, solved: false }, { id: 17, solved: false }, { id: 18, solved: false }, { id: 15, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }
            ], [
                { id: 5, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 18, solved: false }, { id: 0, solved: false }, { id: 8, solved: false }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 16, solved: false }, { id: 2, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 15, solved: false }, { id: 18, solved: false }, { id: 5, solved: false }, { id: 14, solved: false }, { id: 1, solved: true }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 3, solved: false }, { id: 0, solved: true }, { id: 2, solved: false }
            ], [
                { id: 16, solved: false }, { id: 8, solved: false }, { id: 1, solved: false }, { id: 0, solved: true }, { id: 2, solved: false }, { id: 5, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 4, solved: false }, { id: 5, solved: false }, { id: 4, solved: false }, { id: 5, solved: false }, { id: 3, solved: false }, { id: 5, solved: false }, { id: 3, solved: false }, { id: 1, solved: false }, { id: 4, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 15, solved: false }, { id: 12, solved: false }, { id: 2, solved: false }
            ], [
                { id: 3, solved: false }, { id: 3, solved: true }, { id: 16, solved: false }, { id: 12, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 0, solved: true }, { id: 4, solved: false }, { id: 0, solved: false }, { id: 18, solved: false }, { id: 2, solved: false }, { id: 10, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 15, solved: false }, { id: 16, solved: false }, { id: 5, solved: false }, { id: 6, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 3, solved: false }, { id: 4, solved: true }, { id: 17, solved: false }
            ], [
                { id: 4, solved: false }, { id: 2, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 15, solved: false }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 3, solved: true }, { id: 16, solved: false }, { id: 15, solved: false }, { id: 9, solved: false }, { id: 11, solved: false }, { id: 1, solved: true }, { id: 3, solved: false }, { id: 4, solved: false }, { id: 1, solved: true }, { id: 15, solved: false }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 3, solved: false }, { id: 4, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 18, solved: false }
            ], [
                { id: 3, solved: false }, { id: 1, solved: false }, { id: 0, solved: true }, { id: 5, solved: false }, { id: 13, solved: false }, { id: 1, solved: true }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 1, solved: true }, { id: 0, solved: false }, { id: 7, solved: false }, { id: 0, solved: false }, { id: 1, solved: true }, { id: 0, solved: false }, { id: 5, solved: true }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 0, solved: false }, { id: 3, solved: false }, { id: 1, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 5, solved: false }
            ], [
                { id: 3, solved: false }, { id: 5, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 11, solved: false }, { id: 5, solved: true }, { id: 4, solved: false }, { id: 1, solved: true }, { id: 0, solved: false }, { id: 9, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 1, solved: true }, { id: 17, solved: false }, { id: 3, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 5, solved: false }
            ], [
                { id: 4, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 3, solved: false }, { id: 5, solved: false }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 0, solved: false }, { id: 6, solved: false }, { id: 3, solved: false }, { id: 16, solved: false }, { id: 7, solved: false }, { id: 15, solved: false }, { id: 0, solved: false }, { id: 17, solved: false }, { id: 5, solved: false }, { id: 1, solved: false }, { id: 0, solved: true }, { id: 6, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 1, solved: false }, { id: 14, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }
            ], [
                { id: 2, solved: true }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 2, solved: false }, { id: 0, solved: false }, { id: 4, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 1, solved: true }, { id: 2, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 10, solved: false }, { id: 0, solved: false }, { id: 12, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 2, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 2, solved: false }
            ], [
                { id: 3, solved: false }, { id: 4, solved: false }, { id: 17, solved: false }, { id: 8, solved: false }, { id: 4, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 5, solved: false }, { id: 3, solved: true }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 5, solved: false }, { id: 0, solved: false }, { id: 1, solved: true }, { id: 17, solved: false }, { id: 2, solved: false }, { id: 4, solved: false }, { id: 0, solved: false }, { id: 4, solved: false }, { id: 14, solved: false }, { id: 16, solved: false }, { id: 5, solved: true }, { id: 3, solved: false }
            ], [
                { id: 17, solved: false }, { id: 3, solved: false }, { id: 1, solved: false }, { id: 0, solved: true }, { id: 2, solved: false }, { id: 12, solved: false }, { id: 2, solved: false }, { id: 15, solved: false }, { id: 4, solved: false }, { id: 5, solved: false }, { id: 5, solved: false }, { id: 0, solved: true }, { id: 1, solved: false }, { id: 6, solved: false }, { id: 2, solved: false }, { id: 2, solved: false }, { id: 3, solved: true }, { id: 17, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 16, solved: false }, { id: 4, solved: false }, { id: 1, solved: false }, { id: 1, solved: false }, { id: 10, solved: false }
            ], [
                { id: 2, solved: true }, { id: 4, solved: false }, { id: 13, solved: false }, { id: 3, solved: false }, { id: 2, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 3, solved: false }, { id: 3, solved: false }, { id: 1, solved: true }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 1, solved: false }, { id: 5, solved: false }, { id: 0, solved: false }, { id: 17, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 17, solved: false }, { id: 16, solved: false }, { id: 7, solved: false }, { id: 2, solved: false }, { id: 3, solved: false }
            ], [
                { id: 17, solved: false }, { id: 4, solved: false }, { id: 3, solved: true }, { id: 5, solved: false }, { id: 5, solved: false }, { id: 12, solved: false }, { id: 6, solved: false }, { id: 6, solved: false }, { id: 6, solved: false }, { id: 3, solved: false }, { id: 5, solved: false }, { id: 6, solved: false }, { id: 6, solved: false }, { id: 6, solved: false }, { id: 4, solved: false }, { id: 2, solved: false }, { id: 5, solved: false }, { id: 0, solved: false }, { id: 2, solved: false }, { id: 5, solved: false }, { id: 16, solved: false }, { id: 17, solved: false }, { id: 3, solved: false }, { id: 1, solved: false }, { id: 10, solved: false }
            ], [
                { id: 3, solved: false }, { id: 2, solved: false }, { id: 5, solved: false }, { id: 0, solved: true }, { id: 4, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 0, solved: false }, { id: 8, solved: false }, { id: 3, solved: false }, { id: 2, solved: false }, { id: 6, solved: false }, { id: 6, solved: false }, { id: 3, solved: true }, { id: 18, solved: false }, { id: 18, solved: false }, { id: 0, solved: false }, { id: 1, solved: true }, { id: 2, solved: false }, { id: 2, solved: false }, { id: 17, solved: false }, { id: 2, solved: false }, { id: 2, solved: false }, { id: 12, solved: false }, { id: 3, solved: false }
            ]);
            this.aCloudData = new Array([
                { x: 470, y: 268 }, { x: -404, y: 332 }
            ], [
                { x: -417, y: -347 }, { x: 424, y: -286 }, { x: -319, y: 378 }
            ], [
                { x: 335, y: 466 }, { x: -566, y: -414 }
            ], [
                { x: -356, y: 506 }, { x: -12, y: -516 }
            ], [
                { x: 324, y: 452 }, { x: -510, y: 272 }, { x: 436, y: -304 }
            ], [
                { x: 452, y: 154 }, { x: -458, y: 260 }, { x: 582, y: -448 }
            ], [
                { x: -276, y: 428 }, { x: -290, y: -352 }, { x: 542, y: 286 }
            ], [
                { x: 664, y: 404 }, { x: -280, y: -362 }
            ], [
                { x: -230, y: 562 }, { x: -286, y: -500 }, { x: 542, y: 448 }
            ], [
                { x: 550, y: 450 }, { x: -416, y: 402 }
            ], [
                { x: -606, y: 496 }, { x: 615, y: -256 }, { x: -542, y: -514 }
            ], [
                { x: 608, y: 258 }, { x: -636, y: 280 }
            ], [
                { x: 404, y: 432 }, { x: -327, y: 542 }, { x: 588, y: -292 }
            ], [
                { x: 466, y: -492 }, { x: -610, y: 84 }, { x: -248, y: -508 }
            ], [
                { x: 48, y: 586 }, { x: 82, y: -498 }
            ], [
                { x: -362, y: 612 }, { x: -373, y: -374 }
            ], [
                { x: 278, y: -528 }, { x: -470, y: 370 }, { x: 624, y: 26 }
            ], [
                { x: -32, y: -576 }
            ], [
                { x: 450, y: 238 }, { x: -445, y: -342 }, { x: -464, y: 436 }
            ], [
                { x: 604, y: 270 }, { x: -448, y: -366 }
            ], [
                { x: 476, y: 304 }, { x: -456, y: -356 }
            ], [
                { x: 262, y: -526 }, { x: 422, y: 264 }, { x: -434, y: 292 }, { x: -444, y: -348 }
            ], [
                { x: -493, y: 356 }, { x: 598, y: -28 }
            ], [
                { x: -598, y: 484 }, { x: -556, y: -512 }, { x: 358, y: -510 }
            ], [
                { x: 692, y: 146 }, { x: -70, y: -502 }
            ], [
                { x: 316, y: 450 }, { x: -435, y: 300 }
            ], [
                { x: -400, y: 462 }, { x: 582, y: -170 }
            ], [
                { x: -495, y: 336 }, { x: 620, y: -258 }
            ], [
                { x: -564, y: -488 }, { x: -235, y: 542 }
            ], [
                { x: 580, y: 418 }, { x: -445, y: 284 }
            ], [
                { x: 306, y: -362 }
            ], [
                { x: 464, y: 586 }, { x: -720, y: -170 }, { x: 272, y: -636 }
            ], [
                { x: -598, y: 456 }, { x: 554, y: -440 }
            ], [
                { x: 696, y: 18 }, { x: -716, y: -8 }, { x: -59, y: -628 }
            ], [
                { x: 494, y: 576 }, { x: -342, y: -638 }
            ], [
                { x: -16, y: 624 }, { x: -740, y: -134 }, { x: 718, y: 32 }
            ], [
                { x: -590, y: 446 }, { x: -546, y: -498 }
            ], [
                { x: -414, y: 438 }
            ], [
                { x: -556, y: -498 }, { x: -335, y: 558 }
            ], [
                { x: 64, y: -644 }, { x: -596, y: 294 }, { x: 680, y: 12 }
            ]);
            this.oGameElementsImgData = assetLib.getData("gameElements");
            this.oRailSelectTilesImgData = assetLib.getData("railTiles1");
            this.initNextLevel();
        }
        RailTiles.prototype.initNextLevel = function () {
            this.oRailTilesImgData = assetLib.getData("railTiles" + zoneNum);
            this.aDisplayTiles = this.aLevelData[levelNum].slice();
            var tempType;
            for (var i = 0; i < this.aDisplayTiles.length; i++) {
                if (this.aDisplayTiles[i].id > 14) {
                    this.aDisplayTiles[i] = { id: this.aDisplayTiles[i].id, type: "blank", isOver: false, solved: this.aDisplayTiles[i].solved, offsetY: 0, alpha: 0, rot: 0, tween: null };
                }
                else {
                    var tempOffsetY;
                    var tempRot = 0;
                    if (this.aDisplayTiles[i].id >= 11 && this.aDisplayTiles[i].id <= 14) {
                        tempType = "start";
                        tempOffsetY = 0;
                        tempRot = 0;
                    }
                    else if (this.aDisplayTiles[i].id >= 7 && this.aDisplayTiles[i].id <= 10) {
                        tempType = "end";
                        tempOffsetY = 0;
                        tempRot = 0;
                        this.endTileIndex = i;
                    }
                    else if (this.aDisplayTiles[i].id == 6) {
                        tempType = "crossroads";
                        tempOffsetY = 0;
                        tempRot = 0;
                    }
                    else {
                        tempType = "rail";
                        tempOffsetY = -50;
                        tempRot = 0;
                    }
                    this.aDisplayTiles[i] = { id: this.aDisplayTiles[i].id, type: tempType, isOver: false, solved: this.aDisplayTiles[i].solved, offsetY: tempOffsetY, alpha: 0, rot: tempRot, tween: null };
                }
                this.aDisplayTiles[i].tween = TweenLite.to(this.aDisplayTiles[i], Math.random() * .3 + .4, { offsetY: 0, rot: 0, delay: i * .05, ease: "Bounce.easeOut" });
                TweenLite.to(this.aDisplayTiles[i], .2, {
                    alpha: 1, delay: i * .05, ease: "Quad.easeOut", onCompleteParams: [i],
                    onComplete: function (_id) {
                        playSound("tileFlip", .5);
                        if (_id >= 24 && train.solvedState == -1) {
                            train.solvedState = 0;
                        }
                    }
                });
            }
        };
        RailTiles.prototype.getOutDir = function (_id, _enteredDir) {
            switch (_id) {
                case 0:
                case 1:
                case 6:
                    return _enteredDir;
                case 2:
                    if (_enteredDir == 0) {
                        return 1;
                    }
                    else if (_enteredDir == 3) {
                        return 2;
                    }
                    break;
                case 3:
                    if (_enteredDir == 0) {
                        return 3;
                    }
                    else if (_enteredDir == 1) {
                        return 2;
                    }
                    break;
                case 4:
                    if (_enteredDir == 1) {
                        return 0;
                    }
                    else if (_enteredDir == 2) {
                        return 3;
                    }
                    break;
                case 5:
                    if (_enteredDir == 2) {
                        return 1;
                    }
                    else if (_enteredDir == 3) {
                        return 0;
                    }
                    break;
            }
        };
        RailTiles.prototype.isRailConnected = function (_index) {
            var oTemp = { index: null, dir: null };
            switch (this.aSolvedData[_index].dir) {
                case 0:
                    oTemp.index = this.aSolvedData[_index].index - 5;
                    if (oTemp.index >= 0) {
                        var tempId = this.aDisplayTiles[oTemp.index].id;
                        if (tempId == 1
                            || tempId == 2
                            || tempId == 3
                            || tempId == 6
                            || tempId == 9) {
                            if (tempId == 9) {
                                oTemp.dir = 4;
                            }
                            else {
                                oTemp.dir = this.getOutDir(this.aDisplayTiles[oTemp.index].id, this.aSolvedData[_index].dir);
                            }
                        }
                    }
                    break;
                case 1:
                    oTemp.index = this.aSolvedData[_index].index + 1;
                    if (oTemp.index == 0 || (oTemp.index % 5) != 0) {
                        var tempId = this.aDisplayTiles[oTemp.index].id;
                        if (tempId == 0
                            || tempId == 3
                            || tempId == 4
                            || tempId == 6
                            || tempId == 10) {
                            if (tempId == 10) {
                                oTemp.dir = 4;
                            }
                            else {
                                oTemp.dir = this.getOutDir(this.aDisplayTiles[oTemp.index].id, this.aSolvedData[_index].dir);
                            }
                        }
                    }
                    break;
                case 2:
                    oTemp.index = this.aSolvedData[_index].index + 5;
                    if (oTemp.index <= 24) {
                        var tempId = this.aDisplayTiles[oTemp.index].id;
                        if (tempId == 1
                            || tempId == 4
                            || tempId == 5
                            || tempId == 6
                            || tempId == 7) {
                            if (tempId == 7) {
                                oTemp.dir = 4;
                            }
                            else {
                                oTemp.dir = this.getOutDir(this.aDisplayTiles[oTemp.index].id, this.aSolvedData[_index].dir);
                            }
                        }
                    }
                    break;
                case 3:
                    oTemp.index = this.aSolvedData[_index].index;
                    if ((oTemp.index % 5) != 0) {
                        oTemp.index -= 1;
                        var tempId = this.aDisplayTiles[oTemp.index].id;
                        if (tempId == 0
                            || tempId == 2
                            || tempId == 5
                            || tempId == 6
                            || tempId == 8) {
                            if (tempId == 8) {
                                oTemp.dir = 4;
                            }
                            else {
                                oTemp.dir = this.getOutDir(this.aDisplayTiles[oTemp.index].id, this.aSolvedData[_index].dir);
                            }
                        }
                    }
                    break;
            }
            return oTemp;
        };
        RailTiles.prototype.checkSolved = function () {
            var _this = this;
            var tempSolved = false;
            this.aSolvedData = new Array();
            for (var i = 0; i < this.aDisplayTiles.length; i++) {
                if (this.aDisplayTiles[i].type == "start") {
                    this.aSolvedData.push({ index: i, dir: this.aDisplayTiles[i].id - 11 });
                }
            }
            var tempBreakOut = false;
            while (!tempBreakOut && !tempSolved) {
                var oTemp = this.isRailConnected(this.aSolvedData.length - 1);
                if (oTemp.dir == null) {
                    tempBreakOut = true;
                }
                else {
                    this.aSolvedData.push(oTemp);
                    if (this.aSolvedData[this.aSolvedData.length - 1].dir == 4) {
                        tempSolved = true;
                    }
                }
            }
            if (tempBreakOut) {
                tempSolved = false;
            }
            if (tempSolved) {
                userInput.removeHitArea("gameTouch");
                train.go();
                var tempSkip = 0;
                for (var i = 0; i < this.aDisplayTiles.length; i++) {
                    if (this.aDisplayTiles[i].type == "rail") {
                        this.aDisplayTiles[i].isOver = false;
                        tempSkip++;
                        this.aDisplayTiles[i].tween = TweenLite.to(this.aDisplayTiles[i], .15, {
                            offsetY: -20, delay: tempSkip * .1, ease: "Cubic.easeOut", onCompleteParams: [i],
                            onComplete: function (_id) {
                                playSound("tileFlip", .5);
                                _this.aDisplayTiles[_id].solved = true;
                                var tempX = _this.x + ((_id % 5) * _this.tileWidth + _this.tileWidth / 2) * _this.scale;
                                var tempY = _this.y + (Math.floor(_id / 5) * _this.tileHeight + _this.tileHeight / 2) * _this.scale;
                                for (var j = 0; j < 10; j++) {
                                    var tempP = new Elements.Particle(0, tempX, tempY);
                                    aParticles.push(tempP);
                                }
                                _this.aDisplayTiles[_id].tween = TweenLite.to(_this.aDisplayTiles[_id], .3, {
                                    offsetY: 0, ease: "Bounce.easeOut", onCompleteParams: [_id],
                                    onComplete: function (_id) {
                                    }
                                });
                            }
                        });
                    }
                }
            }
        };
        RailTiles.prototype.overCheck = function (_x, _y) {
            for (var i = 0; i < this.aDisplayTiles.length; i++) {
                if (this.aDisplayTiles[i].type == "rail" && !this.aDisplayTiles[i].solved) {
                    var tx = this.x + (i % 5) * this.tileWidth * this.scale;
                    var ty = this.y + Math.floor(i / 5) * this.tileHeight * this.scale;
                    if (_x > tx
                        && _x < tx + this.tileWidth * this.scale
                        && _y > ty
                        && _y < ty + this.tileWidth * this.scale) {
                        this.aDisplayTiles[i].isOver = true;
                    }
                    else {
                        this.aDisplayTiles[i].isOver = false;
                    }
                }
            }
        };
        RailTiles.prototype.tap = function (_x, _y) {
            for (var i = 0; i < this.aDisplayTiles.length; i++) {
                if (this.aDisplayTiles[i].type == "rail" && !this.aDisplayTiles[i].solved) {
                    var tx = this.x + (i % 5) * this.tileWidth * this.scale;
                    var ty = this.y + Math.floor(i / 5) * this.tileHeight * this.scale;
                    if (_x > tx
                        && _x < tx + this.tileWidth * this.scale
                        && _y > ty
                        && _y < ty + this.tileWidth * this.scale) {
                        this.aDisplayTiles[i].id = this.getRotateId(this.aDisplayTiles[i].id);
                        playSound("rotate" + Math.floor(Math.random() * 3));
                        if (isMobile) {
                            if (this.aDisplayTiles[i].tween) {
                                this.aDisplayTiles[i].tween.kill();
                            }
                            this.aDisplayTiles[i].rot = 10 * radian;
                            this.aDisplayTiles[i].tween = TweenLite.to(this.aDisplayTiles[i], .5, { rot: 0, ease: "Back.easeOut" });
                        }
                        this.checkSolved();
                        for (var j = 0; j < 10; j++) {
                            var tempP = new Elements.Particle(1, tx + (this.tileWidth / 2) * this.scale, ty + (this.tileHeight / 2) * this.scale, .5);
                            aParticles.push(tempP);
                        }
                    }
                }
            }
        };
        RailTiles.prototype.getRotateId = function (_id) {
            var temp;
            if (_id == 0) {
                temp = 1;
            }
            else if (_id == 1) {
                temp = 0;
            }
            if (_id == 2) {
                temp = 3;
            }
            else if (_id == 3) {
                temp = 4;
            }
            else if (_id == 4) {
                temp = 5;
            }
            else if (_id == 5) {
                temp = 2;
            }
            return temp;
        };
        RailTiles.prototype.update = function () {
            this.inc += delta;
            if (canvas.width > canvas.height) {
                this.scale = Math.min((canvas.width - this.uiMinWidth) / (this.tileWidth * 5), 1) * Math.min((canvas.height - this.buffer * 2) / (this.tileHeight * 5), 1);
                this.x = Math.min(canvas.width - this.tileWidth * 2.5 * this.scale - this.buffer, (canvas.width - this.uiMaxWidth) / 2 + this.uiMaxWidth) - this.tileWidth * 2.5 * this.scale;
                this.y = canvas.height / 2 - this.tileHeight * 2.5 * this.scale;
                this.windowX = this.buffer;
                this.windowY = this.windowOffsetY;
                this.windowWidth = Math.min(canvas.width - this.tileWidth * 5 * this.scale - this.buffer * 4, this.uiMaxWidth - this.buffer * 2);
                this.windowHeight = canvas.height - this.windowOffsetY - this.buffer * 2;
            }
            else {
                this.scale = Math.min((canvas.width - this.buffer * 2) / (this.tileWidth * 5), 1) * Math.min((canvas.height - this.uiMinHeight) / (this.tileHeight * 5), 1);
                this.x = canvas.width / 2 - this.tileWidth * 2.5 * this.scale;
                this.y = Math.min(canvas.height - this.tileHeight * 2.5 * this.scale - this.buffer, (canvas.height - this.uiMaxHeight) / 2 + this.uiMaxHeight) - this.tileHeight * 2.5 * this.scale;
                this.windowX = this.buffer;
                this.windowY = this.windowOffsetY;
                this.windowWidth = canvas.width - this.buffer * 2;
                this.windowHeight = Math.min(canvas.height - this.tileHeight * 5 * this.scale - this.buffer * 4, this.uiMaxHeight - this.buffer * 2) - this.windowOffsetY;
            }
        };
        RailTiles.prototype.render = function () {
            for (var i = 0; i < this.aDisplayTiles.length; i++) {
                var tempFrame = this.aDisplayTiles[i].id;
                var tempOData = this.oRailTilesImgData;
                if (this.aDisplayTiles[i].type == "rail" && !this.aDisplayTiles[i].solved) {
                    tempFrame += 19;
                    tempOData = this.oRailSelectTilesImgData;
                }
                var tx = this.x + (i % 5) * this.tileWidth * this.scale + tempOData.oData.spriteWidth / 2 * this.scale;
                var ty = this.y + Math.floor(i / 5) * this.tileHeight * this.scale + tempOData.oData.spriteHeight / 2 * this.scale;
                var imgX = (tempFrame * (tempOData.oData.spriteWidth + frameBuffer)) % tempOData.img.width;
                var imgY = Math.floor(tempFrame / (tempOData.img.width / (tempOData.oData.spriteWidth + frameBuffer))) * (tempOData.oData.spriteHeight + frameBuffer);
                var tempRot = 0;
                if (this.aDisplayTiles[i].isOver || (levelNum < 2 && this.aDisplayTiles[i].type == "rail" && !this.aDisplayTiles[i].solved)) {
                    tempRot = Math.sin(this.inc * 10) * .05;
                }
                ctx.save();
                ctx.globalAlpha = this.aDisplayTiles[i].alpha;
                ctx.translate(tx, ty + this.aDisplayTiles[i].offsetY);
                ctx.rotate(this.aDisplayTiles[i].rot + tempRot);
                ctx.drawImage(tempOData.img, imgX, imgY, tempOData.oData.spriteWidth, tempOData.oData.spriteHeight, 0 - tempOData.oData.spriteWidth / 2 * this.scale, 0 - tempOData.oData.spriteHeight / 2 * this.scale, tempOData.oData.spriteWidth * this.scale, tempOData.oData.spriteHeight * this.scale);
                ctx.restore();
            }
            for (var i = 0; i < this.aDisplayTiles.length; i++) {
                var tx = this.x + (i % 5) * this.tileWidth * this.scale;
                var ty = this.y + Math.floor(i / 5) * this.tileHeight * this.scale;
                if (this.aDisplayTiles[i].isOver) {
                    var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds.overHighlight].x;
                    var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds.overHighlight].y;
                    var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds.overHighlight].width;
                    var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds.overHighlight].height;
                    ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, tx - 8, ty - 10, bWidth * this.scale, bHeight * this.scale);
                }
            }
        };
        return RailTiles;
    }());
    Elements.RailTiles = RailTiles;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var Train = (function () {
        function Train() {
            this.rot = 0;
            this.smokeInc = 0;
            this.inc = 0;
            this.electricScale = 0;
            this.oGameElementsImgData = assetLib.getData("gameElements");
            this.oElectricImgData = assetLib.getData("electric");
            this.initNextLevel();
        }
        Train.prototype.initNextLevel = function () {
            this.solvedState = -1;
            for (var i = 0; i < railTiles.aDisplayTiles.length; i++) {
                if (railTiles.aDisplayTiles[i].type == "start") {
                    this.startTileId = i;
                    break;
                }
            }
            this.getStartRot(railTiles.aDisplayTiles[this.startTileId].id - 11);
            this.rot = this.targRot;
        };
        Train.prototype.getStartRot = function (_dir) {
            switch (_dir) {
                case 0:
                    this.targRot = -90 * radian;
                    break;
                case 1:
                    this.targRot = 0 * radian;
                    break;
                case 2:
                    this.targRot = 90 * radian;
                    break;
                case 3:
                    this.targRot = 180 * radian;
                    break;
            }
            this.prevDirId = _dir;
        };
        Train.prototype.getRotFromDir = function (_dir) {
            switch (_dir) {
                case 0:
                    if (this.prevDirId == 1) {
                        this.targRot -= 90 * radian;
                    }
                    else if (this.prevDirId == 3) {
                        this.targRot += 90 * radian;
                    }
                    break;
                case 1:
                    if (this.prevDirId == 0) {
                        this.targRot += 90 * radian;
                    }
                    else if (this.prevDirId == 2) {
                        this.targRot -= 90 * radian;
                    }
                    break;
                case 2:
                    if (this.prevDirId == 1) {
                        this.targRot += 90 * radian;
                    }
                    else if (this.prevDirId == 3) {
                        this.targRot -= 90 * radian;
                    }
                    break;
                case 3:
                    if (this.prevDirId == 0) {
                        this.targRot -= 90 * radian;
                    }
                    else if (this.prevDirId == 2) {
                        this.targRot += 90 * radian;
                    }
                    break;
            }
            this.prevDirId = _dir;
        };
        Train.prototype.go = function () {
            this.solvedState = 1;
            this.tileInc = 1;
            this.travelX = ((this.startTileId % 5) * railTiles.tileWidth + railTiles.tileWidth / 2) * railTiles.scale;
            this.travelY = (Math.floor(this.startTileId / 5) * railTiles.tileHeight + railTiles.tileHeight / 2) * railTiles.scale;
            this.nextTileTween(.5);
            if (zoneNum == 3) {
                TweenLite.to(this, .2, { electricScale: 1, delay: .5, ease: Linear.easeNone });
            }
            playSound("whistle" + zoneNum, .75);
            loopSound("chug" + zoneNum, .3);
        };
        Train.prototype.nextTileTween = function (_delay) {
            var _this = this;
            if (_delay === void 0) { _delay = 0; }
            if (this.tileTween) {
                this.tileTween.kill();
            }
            var tx = ((railTiles.aSolvedData[this.tileInc].index % 5) * railTiles.tileWidth + railTiles.tileWidth / 2) * railTiles.scale;
            var ty = (Math.floor(railTiles.aSolvedData[this.tileInc].index / 5) * railTiles.tileHeight + railTiles.tileHeight / 2) * railTiles.scale;
            var tempEase;
            var tempTime = .5;
            if (this.tileInc == 1) {
                tempEase = Quad.easeIn;
                tempTime *= 2;
            }
            else if (this.tileInc == railTiles.aSolvedData.length - 1) {
                tempEase = Quad.easeOut;
                tempTime *= 2;
                playSound("trainEnd");
            }
            else {
                tempEase = Linear.easeNone;
            }
            this.tileTween = TweenLite.to(this, tempTime, {
                travelX: tx, travelY: ty, delay: _delay, ease: tempEase,
                onComplete: function () {
                    playSound("points" + Math.floor(Math.random() * 4), .1);
                    if (++_this.tileInc < railTiles.aSolvedData.length) {
                        _this.nextTileTween();
                        var tempSC = new Elements.ScoreWin(_this.x, _this.y, 0);
                        aParticles.push(tempSC);
                    }
                    else {
                        var tempSC = new Elements.ScoreWin(_this.x, _this.y, 1);
                        aParticles.push(tempSC);
                        _this.solvedState = 2;
                        if (zoneNum == 3) {
                            TweenLite.to(_this, .2, { electricScale: 0, ease: Linear.easeNone });
                        }
                        for (var j = 0; j < 30; j++) {
                            var tempP = new Elements.Particle(0, _this.x, _this.y);
                            aParticles.push(tempP);
                        }
                        stopLoopSound();
                        playSound("success", .3);
                        setTimeout(function () {
                            initNextLevel();
                        }, 2000);
                    }
                }
            });
            if (railTiles.aSolvedData[this.tileInc].dir < 4) {
                this.getRotFromDir(railTiles.aSolvedData[this.tileInc].dir);
                this.rotTween = TweenLite.to(this, tempTime * .4, {
                    rot: this.targRot, ease: Quad.easeInOut, delay: tempTime * .8 + _delay,
                    onComplete: function () {
                    }
                });
            }
        };
        Train.prototype.update = function () {
            if (this.solvedState == 0 || this.solvedState == -1) {
                this.x = railTiles.x + ((this.startTileId % 5) * railTiles.tileWidth + railTiles.tileWidth / 2) * railTiles.scale;
                this.y = railTiles.y + (Math.floor(this.startTileId / 5) * railTiles.tileHeight + railTiles.tileHeight / 2) * railTiles.scale;
            }
            else if (this.solvedState == 1) {
                this.x = railTiles.x + this.travelX;
                this.y = railTiles.y + this.travelY;
                if (this.tileInc < railTiles.aSolvedData.length - 1 && zoneNum != 3) {
                    this.smokeInc += delta;
                    if (this.smokeInc > .25) {
                        var tempS = new Elements.Smoke(this.x + (30 * railTiles.scale) * Math.cos(this.rot), this.y + (30 * railTiles.scale) * Math.sin(this.rot));
                        aParticles.push(tempS);
                        this.smokeInc = 0;
                    }
                }
            }
            else if (this.solvedState == 2) {
                this.x = railTiles.x + ((railTiles.aSolvedData[railTiles.aSolvedData.length - 1].index % 5) * railTiles.tileWidth + railTiles.tileWidth / 2) * railTiles.scale;
                this.y = railTiles.y + (Math.floor(railTiles.aSolvedData[railTiles.aSolvedData.length - 1].index / 5) * railTiles.tileHeight + railTiles.tileHeight / 2) * railTiles.scale;
            }
            this.inc += 20 * delta;
        };
        Train.prototype.render = function () {
            var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds["trainShadow" + zoneNum]].x;
            var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds["trainShadow" + zoneNum]].y;
            var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds["trainShadow" + zoneNum]].width;
            var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds["trainShadow" + zoneNum]].height;
            ctx.save();
            ctx.translate(this.x, this.y + 30 * railTiles.scale);
            ctx.rotate(this.rot);
            ctx.globalAlpha = railTiles.aDisplayTiles[this.startTileId].alpha;
            ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, -bWidth / 2 * railTiles.scale, -bHeight / 2 * railTiles.scale, bWidth * railTiles.scale, bHeight * railTiles.scale);
            ctx.restore();
            var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds["train" + zoneNum]].x;
            var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds["train" + zoneNum]].y;
            var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds["train" + zoneNum]].width;
            var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds["train" + zoneNum]].height;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rot);
            ctx.globalAlpha = railTiles.aDisplayTiles[this.startTileId].alpha;
            ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, -bWidth / 2 * railTiles.scale, -bHeight / 2 * railTiles.scale, bWidth * railTiles.scale, bHeight * railTiles.scale);
            if (zoneNum == 3) {
                var tempFrame = Math.floor(this.inc) % 10;
                var imgX = (tempFrame * (this.oElectricImgData.oData.spriteWidth + frameBuffer)) % this.oElectricImgData.img.width;
                var imgY = Math.floor(tempFrame / (this.oElectricImgData.img.width / (this.oElectricImgData.oData.spriteWidth + frameBuffer))) * (this.oElectricImgData.oData.spriteHeight + frameBuffer);
                ctx.drawImage(this.oElectricImgData.img, imgX, imgY, this.oElectricImgData.oData.spriteWidth, this.oElectricImgData.oData.spriteHeight, -(bWidth / 2 + 30) * railTiles.scale * this.electricScale, -bHeight / 2 * railTiles.scale * this.electricScale, this.oElectricImgData.oData.spriteWidth * railTiles.scale * this.electricScale, this.oElectricImgData.oData.spriteHeight * railTiles.scale * this.electricScale);
            }
            ctx.restore();
        };
        return Train;
    }());
    Elements.Train = Train;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var Particle = (function () {
        function Particle(_type, _x, _y, _scale) {
            var _this = this;
            if (_scale === void 0) { _scale = 1; }
            this.x = 0;
            this.y = 0;
            this.fallY = 0;
            this.removeMe = false;
            this.aColours = new Array("#A300F7", "#0075F7", "#00E91C", "#F7E800", "#F77B00", "#F70900");
            this.type = _type;
            this.scale = (Math.random() * 10 + 10) * _scale;
            this.angle = (Math.random() * 360) * radian;
            this.rot = (Math.random() * 360) * radian;
            this.colId = Math.floor(Math.random() * this.aColours.length);
            this.dist = Math.random() * 200 + 200;
            this.x = _x + 75 * Math.cos(this.angle);
            this.y = _y + 75 * Math.sin(this.angle);
            this.rotRate = Math.random() * 20 - 10;
            var tempTime = 1 + Math.random() * 2;
            if (_type == 1) {
                this.dist *= .5;
                tempTime *= .5;
            }
            TweenLite.to(this, tempTime, {
                scale: 0, x: this.x + this.dist * Math.cos(this.angle), y: this.y + this.dist * Math.sin(this.angle), ease: "Cubic.easeOut",
                onComplete: function () {
                    _this.removeMe = true;
                }
            });
        }
        Particle.prototype.update = function () {
            this.rot += delta * this.rotRate;
        };
        Particle.prototype.render = function () {
            if (this.type == 0) {
                ctx.strokeStyle = this.aColours[this.colId];
            }
            else {
                ctx.strokeStyle = "#DAAFFF";
            }
            ctx.lineWidth = this.scale;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - (2 * this.scale) * Math.cos(this.rot), this.y - (2 * this.scale) * Math.sin(this.rot));
            ctx.stroke();
        };
        return Particle;
    }());
    Elements.Particle = Particle;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var ScoreWin = (function () {
        function ScoreWin(_x, _y, _id) {
            var _this = this;
            this.x = 0;
            this.y = 0;
            this.removeMe = false;
            this.oGameElementsImgData = assetLib.getData("gameElements");
            this.id = _id;
            this.scale = 0;
            this.x = _x;
            this.y = _y;
            var tempX;
            var tempY;
            if (canvas.width > canvas.height) {
                tempX = railTiles.windowWidth + railTiles.buffer * 2 - 193 + 113;
                tempY = 38 + 42;
            }
            else {
                tempX = canvas.width / 2 - 56 + 113;
                tempY = 38 + 42;
            }
            TweenLite.to(this, .3, {
                scale: 1, ease: "Quad.easeOut"
            });
            TweenLite.to(this, 1, {
                x: tempX, y: tempY, ease: "Back.easeIn",
                onComplete: function () {
                    if (_this.id == 0) {
                        totalScore += 10;
                    }
                    else {
                        totalScore += 50;
                    }
                    _this.removeMe = true;
                }
            });
        }
        ScoreWin.prototype.update = function () {
        };
        ScoreWin.prototype.render = function () {
            var bX = this.oGameElementsImgData.oData.oAtlasData[oImageIds["score" + this.id]].x;
            var bY = this.oGameElementsImgData.oData.oAtlasData[oImageIds["score" + this.id]].y;
            var bWidth = this.oGameElementsImgData.oData.oAtlasData[oImageIds["score" + this.id]].width;
            var bHeight = this.oGameElementsImgData.oData.oAtlasData[oImageIds["score" + this.id]].height;
            ctx.drawImage(this.oGameElementsImgData.img, bX, bY, bWidth, bHeight, this.x - bWidth / 2 * this.scale, this.y - bHeight / 2 * this.scale, bWidth * this.scale, bHeight * this.scale);
        };
        return ScoreWin;
    }());
    Elements.ScoreWin = ScoreWin;
})(Elements || (Elements = {}));
var Elements;
(function (Elements) {
    var Smoke = (function () {
        function Smoke(_x, _y) {
            var _this = this;
            this.x = 0;
            this.y = 0;
            this.removeMe = false;
            this.aColours = new Array("#FFFFFF", "#EDEEF0", "#C4C4C4");
            this.aCircles = new Array();
            var temp = Math.floor(Math.random() * 3 + 8);
            for (var i = 0; i < temp; i++) {
                this.aCircles.push({ scale: 0, x: Math.random() * 3 - 1.5, y: Math.random() * 3 - 1.5, angle: (Math.random() * 360) * radian, dist: Math.random() * 15 + 15 });
            }
            this.x = _x;
            this.y = _y;
            this.distRate = 0;
            var tempScaleTime = 2;
            TweenLite.to(this, .3, {
                distRate: .3, ease: "Cubic.easeOut",
                onComplete: function () {
                    TweenLite.to(_this, tempScaleTime, {
                        distRate: 1, ease: "Cubic.easeOut",
                        onComplete: function () {
                            _this.removeMe = true;
                        }
                    });
                }
            });
            for (var i = 0; i < this.aCircles.length; i++) {
                TweenLite.to(this.aCircles[i], .3, {
                    scale: Math.random() * 5 + 7, ease: "Cubic.easeOut", onCompleteParams: [i],
                    onComplete: function (_id) {
                        tempScaleTime = Math.random() * 1 + 1;
                        TweenLite.to(_this.aCircles[_id], tempScaleTime, {
                            scale: 0, ease: "Cubic.easeIn",
                            onComplete: function () {
                            }
                        });
                    }
                });
            }
        }
        Smoke.prototype.update = function () {
        };
        Smoke.prototype.render = function () {
            for (var i = 0; i < this.aCircles.length; i++) {
                ctx.fillStyle = this.aColours[2];
                ctx.beginPath();
                ctx.arc(this.x + ((this.distRate * this.aCircles[i].dist + this.aCircles[i].x * this.aCircles[i].scale) * railTiles.scale) * Math.cos(this.aCircles[i].angle), this.y + ((this.distRate * this.aCircles[i].dist + this.aCircles[i].y * this.aCircles[i].scale) * railTiles.scale) * Math.sin(this.aCircles[i].angle) + (.5 * this.aCircles[i].scale * railTiles.scale), this.aCircles[i].scale * railTiles.scale, 0, 2 * Math.PI);
                ctx.fill();
            }
            for (var i = 0; i < this.aCircles.length; i++) {
                ctx.fillStyle = this.aColours[1];
                ctx.beginPath();
                ctx.arc(this.x + ((this.distRate * this.aCircles[i].dist + this.aCircles[i].x * this.aCircles[i].scale) * railTiles.scale) * Math.cos(this.aCircles[i].angle), this.y + ((this.distRate * this.aCircles[i].dist + this.aCircles[i].y * this.aCircles[i].scale) * railTiles.scale) * Math.sin(this.aCircles[i].angle), this.aCircles[i].scale * railTiles.scale, 0, 2 * Math.PI);
                ctx.fill();
            }
        };
        return Smoke;
    }());
    Elements.Smoke = Smoke;
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
var maxWidth = 800;
var minWidth = 800;
var maxHeight = 800;
var minHeight = 800;
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
        src: ['audio/sound.mp3'],
        sprite: {
            silence: [
                0,
                0
            ],
            chug0: [
                500,
                2693.673469387755
            ],
            chug1: [
                4000,
                768.2086167800453
            ],
            chug2: [
                5500,
                1071.8820861678005
            ],
            chug3: [
                8000,
                2699.931972789116
            ],
            click: [
                11500,
                141.51927437641731
            ],
            endSuccess: [
                13000,
                2890.6802721088434
            ],
            intro: [
                16500,
                1914.2403628117925
            ],
            levelStart: [
                19000,
                1187.4149659863954
            ],
            points0: [
                21500,
                915.3061224489783
            ],
            points1: [
                23000,
                805.9637188208626
            ],
            points2: [
                24500,
                865.6009070294779
            ],
            points3: [
                26000,
                806.4399092970511
            ],
            rotate0: [
                27500,
                551.8820861678009
            ],
            rotate1: [
                29000,
                352.44897959183777
            ],
            rotate2: [
                30500,
                480.952380952381
            ],
            success: [
                32000,
                1806.0997732426288
            ],
            tileFlip: [
                34500,
                195.89569160997655
            ],
            trainEnd: [
                36000,
                3076.9387755102075
            ],
            whistle0: [
                40500,
                1802.6757369614543
            ],
            whistle1: [
                43000,
                1145.19274376417
            ],
            whistle2: [
                45500,
                1445.396825396827
            ],
            whistle3: [
                48000,
                803.6054421768739
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
var railTiles;
var train;
var aParticles;
var zoneNum = 0;
var curChugLoop;
var aZoneOrder = new Array(1, 1, 3, 3, 2, 2, 0, 0, 1, 1, 3, 3, 2, 2, 0, 0, 1, 1, 3, 3, 2, 2, 0, 0, 1, 1, 3, 3, 2, 2, 0, 0, 1, 1, 3, 3, 2, 2, 0, 0);
function loadLang(_lang) {
    curLang = _lang;
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
    levelNum = 0;
    zoneNum = aZoneOrder[levelNum];
    totalScore = 0;
    initStartScreen();
}
function initStartScreen() {
    gameState = "start";
    if (audioType == 1) {
        music.fade(music.volume(), .5, 100);
    }
    background = new Elements.Background();
    var oPlayBut = { oImgData: assetLib.getData("uiButs"), aPos: [-130, -130], align: [1, 1], id: oImageIds.playBut, idOver: oImageIds.playButOver, flash: true };
    var oInfoBut = { oImgData: assetLib.getData("uiButs"), aPos: [45, 50], align: [0, 0], id: oImageIds.infoBut, idOver: oImageIds.infoButOver };
    userInput.addHitArea("introFromStart", butEventHandler, null, "image", oPlayBut);
    userInput.addHitArea("credits", butEventHandler, null, "image", oInfoBut);
    var aButs = new Array(oPlayBut, oInfoBut);
    addMuteBut(aButs);
    panel = new Elements.Panel(gameState, aButs);
    aParticles = new Array();
    panel.startTween1();
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
        var oMuteBut;
        if (gameState == "intro" || gameState == "outro") {
            oMuteBut = { oImgData: assetLib.getData("uiButs"), aPos: [45, 50], align: [0, 0], id: mb, idOver: mbOver };
        }
        else {
            oMuteBut = { oImgData: assetLib.getData("uiButs"), aPos: [120, 50], align: [0, 0], id: mb, idOver: mbOver };
        }
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
    var oBackBut = { oImgData: assetLib.getData("uiButs"), aPos: [45, 50], align: [0, 0], id: oImageIds.backBut, idOver: oImageIds.backButOver };
    userInput.addHitArea("backFromCredits", butEventHandler, null, "image", oBackBut);
    var aButs = new Array(oBackBut);
    background = new Elements.Background();
    panel = new Elements.Panel(gameState, aButs);
    addMuteBut(aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    updateCreditsScreenEvent();
}
function initIntro() {
    gameState = "intro";
    playSound("intro", .3);
    var oPlayBut = { oImgData: assetLib.getData("uiButs"), aPos: [-130, -130], align: [1, 1], id: oImageIds.playBut, idOver: oImageIds.playButOver, flash: true };
    userInput.addHitArea("gameFromIntro", butEventHandler, null, "image", oPlayBut);
    var aButs = new Array(oPlayBut);
    background = new Elements.Background();
    panel = new Elements.Panel(gameState, aButs);
    addMuteBut(aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    updateIntroScreenEvent();
}
function initOutro() {
    gameState = "outro";
    playSound("endSuccess");
    var oBackBut = { oImgData: assetLib.getData("uiButs"), aPos: [45, -50], align: [0, 1], id: oImageIds.backBut, idOver: oImageIds.backButOver, flash: true };
    userInput.addHitArea("startFromOutro", butEventHandler, null, "image", oBackBut);
    var aButs = new Array(oBackBut);
    background = new Elements.Background();
    panel = new Elements.Panel(gameState, aButs);
    aParticles = new Array();
    addMuteBut(aButs);
    panel.startTween1();
    previousTime = new Date().getTime();
    updateOutroScreenEvent();
}
function initGame() {
    gameState = "game";
    if (audioType == 1) {
        music.fade(music.volume(), .75, 500);
    }
    playSound("levelStart", .3);
    railTiles = new Elements.RailTiles();
    train = new Elements.Train();
    background = new Elements.Background();
    railTiles.update();
    updateGameTouch();
    var oMenuBut = { oImgData: assetLib.getData("uiButs"), aPos: [45, 50], align: [0, 0], id: oImageIds.menuBut, idOver: oImageIds.menuButOver };
    userInput.addHitArea("pause", butEventHandler, null, "image", oMenuBut);
    var aButs = new Array(oMenuBut);
    addMuteBut(aButs);
    panel = new Elements.Panel(gameState, aButs);
    panel.startTween1();
    panel.introTween();
    aParticles = new Array();
    previousTime = new Date().getTime();
    updateGameEvent();
}
function initNextLevel() {
    levelNum++;
    if (levelNum >= 40) {
        initOutro();
        return;
    }
    zoneNum = aZoneOrder[levelNum];
    if (levelNum == 2 || levelNum == 4 || levelNum == 6) {
        initIntro();
        return;
    }
    playSound("levelStart", .3);
    background = new Elements.Background();
    railTiles.initNextLevel();
    train.initNextLevel();
    panel.introTween();
    userInput.addHitArea("gameTouch", butEventHandler, { multiTouch: true }, "rect", { aRect: [0, 0, canvas.width, canvas.height] }, true);
}
function updateGameTouch() {
    if (canvas.width > canvas.height) {
        userInput.addHitArea("gameTouch", butEventHandler, { multiTouch: true }, "rect", { aRect: [railTiles.windowWidth + railTiles.buffer * 2, 0, canvas.width, canvas.height] }, true);
    }
    else {
        userInput.addHitArea("gameTouch", butEventHandler, { multiTouch: true }, "rect", { aRect: [0, railTiles.windowHeight + railTiles.windowOffsetY + railTiles.buffer * 2, canvas.width, canvas.height] }, true);
    }
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
            userInput.removeHitArea("moreGames");
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
            initStartScreen();
            break;
        case "gameFromIntro":
            playSound("click");
            userInput.removeHitArea("gameFromIntro");
            userInput.removeHitArea("mute");
            initGame();
            break;
        case "introFromStart":
            playSound("click");
            userInput.removeHitArea("introFromStart");
            userInput.removeHitArea("credits");
            userInput.removeHitArea("mute");
            if (levelNum >= 40) {
                initOutro();
                return;
            }
            else {
                zoneNum = aZoneOrder[levelNum];
                initIntro();
            }
            break;
        case "gameTouch":
            if (_oData.isDown) {
                railTiles.tap(_oData.x, _oData.y);
            }
            else {
            }
            break;
        case "startFromOutro":
            playSound("click");
            userInput.removeHitArea("startFromOutro");
            userInput.removeHitArea("mute");
            levelNum = 0;
            zoneNum = Math.floor(levelNum / 10);
            totalScore = 0;
            initStartScreen();
            break;
        case "nextLevel":
            playSound("click");
            userInput.removeHitArea("jumpHeight");
            userInput.removeHitArea("dashLength");
            userInput.removeHitArea("turnRate");
            userInput.removeHitArea("nextLevel");
            userInput.removeHitArea("mute");
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
            if (train.tileTween) {
                train.tileTween.kill();
            }
            userInput.removeHitArea("pause");
            userInput.removeHitArea("gameTouch");
            userInput.removeHitArea("mute");
            stopLoopSound();
            if (train.solvedState == 1) {
                levelNum++;
            }
            initStartScreen();
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
function updateScore(_inc) {
    levelScore += _inc;
}
function initLevelComplete() {
    gameState = "levelComplete";
    if (audioType == 1) {
        music.fade(music.volume(), .25, 500);
    }
    playSound("levelComplete");
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
    playSound("gameFail");
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
    railTiles.update();
    railTiles.render();
    train.update();
    train.render();
    panel.update();
    panel.render();
    for (var i = 0; i < aParticles.length; i++) {
        aParticles[i].update();
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
    ctx.fillText("v0.0.8", canvas.width / 2, canvas.height - 10);
    requestAnimFrame(updateCreditsScreenEvent);
}
function updateIntroScreenEvent() {
    if (gameState != "intro") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    checkButtonsOver();
    requestAnimFrame(updateIntroScreenEvent);
}
function updateOutroScreenEvent() {
    if (gameState != "outro") {
        return;
    }
    delta = getDelta();
    background.render();
    panel.update();
    panel.render();
    if (Math.random() > .65) {
        var tempP;
        tempP = new Elements.Particle(0, Math.random() * canvas.width, Math.random() * canvas.height, 2);
        aParticles.push(tempP);
    }
    for (var i = 0; i < aParticles.length; i++) {
        aParticles[i].update();
        aParticles[i].render();
        if (aParticles[i].removeMe) {
            aParticles.splice(i, 1);
            i -= 1;
        }
    }
    checkButtonsOver();
    requestAnimFrame(updateOutroScreenEvent);
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
    if (Math.random() > .65) {
        var tempScale = Math.min(canvas.width / panel.oTitleLogoImgData.img.width, 1.3);
        var tempP;
        if (canvas.width > canvas.height) {
            tempP = new Elements.Particle(0, Math.max(canvas.width * .05, 50) + (panel.oTitleLogoImgData.img.width / 2) * tempScale, Math.max(canvas.height * .2 - (panel.oTitleLogoImgData.img.height / 2) * tempScale, -50) + (panel.oTitleLogoImgData.img.height / 2) * tempScale + panel.posY, 2);
        }
        else {
            tempP = new Elements.Particle(0, canvas.width / 2, Math.max(canvas.height * .2 - (panel.oTitleLogoImgData.img.height / 2) * tempScale, -50) + (panel.oTitleLogoImgData.img.height / 2) * tempScale + panel.posY, 2);
        }
        aParticles.push(tempP);
    }
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
            id: "loader",
            file: "images/loader.png"
        }, {
            id: "loadSpinner",
            file: "images/loadSpinner.png"
        }], ctx, canvas.width, canvas.height, false);
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
            id: "bgMain0a",
            file: "images/bgMain0a.jpg"
        }, {
            id: "bgMain0b",
            file: "images/bgMain0b.jpg"
        }, {
            id: "bgMain1a",
            file: "images/bgMain1a.jpg"
        }, {
            id: "bgMain1b",
            file: "images/bgMain1b.jpg"
        }, {
            id: "bgMain2a",
            file: "images/bgMain2a.jpg"
        }, {
            id: "bgMain2b",
            file: "images/bgMain2b.jpg"
        }, {
            id: "bgMain3a",
            file: "images/bgMain3a.jpg"
        }, {
            id: "bgMain3b",
            file: "images/bgMain3b.jpg"
        }, {
            id: "bgTitle",
            file: "images/titleBg.jpg"
        }, {
            id: "splashLogo",
            file: "images/info.png"
        }, {
            id: "flare",
            file: "images/flare.png"
        }, {
            id: "uiButs",
            file: "images/uiButs.png",
            oAtlasData: {
                id0: { x: 70, y: 289, width: 68, height: 74 },
                id1: { x: 280, y: 213, width: 68, height: 74 },
                id10: { x: 0, y: 289, width: 68, height: 74 },
                id11: { x: 0, y: 213, width: 68, height: 74 },
                id2: { x: 210, y: 289, width: 68, height: 74 },
                id3: { x: 210, y: 213, width: 68, height: 74 },
                id4: { x: 140, y: 289, width: 68, height: 74 },
                id5: { x: 140, y: 213, width: 68, height: 74 },
                id6: { x: 280, y: 289, width: 68, height: 74 },
                id7: { x: 70, y: 213, width: 68, height: 74 },
                id8: { x: 0, y: 0, width: 202, height: 211 },
                id9: { x: 204, y: 0, width: 202, height: 211 }
            }
        }, {
            id: "gameElements",
            file: "images/gameElements.png",
            oAtlasData: {
                id0: { x: 348, y: 1783, width: 119, height: 61 },
                id1: { x: 283, y: 1624, width: 140, height: 92 },
                id10: { x: 175, y: 1760, width: 171, height: 88 },
                id11: { x: 465, y: 1846, width: 100, height: 60 },
                id12: { x: 436, y: 1476, width: 110, height: 60 },
                id13: { x: 0, y: 1689, width: 281, height: 69 },
                id14: { x: 0, y: 1476, width: 281, height: 69 },
                id15: { x: 0, y: 1618, width: 281, height: 69 },
                id16: { x: 0, y: 752, width: 704, height: 632 },
                id17: { x: 0, y: 1386, width: 637, height: 88 },
                id18: { x: 752, y: 615, width: 86, height: 124 },
                id19: { x: 574, y: 1601, width: 86, height: 126 },
                id2: { x: 431, y: 1565, width: 118, height: 134 },
                id20: { x: 574, y: 1729, width: 86, height: 126 },
                id21: { x: 551, y: 1476, width: 86, height: 123 },
                id22: { x: 1308, y: 615, width: 580, height: 663 },
                id23: { x: 1308, y: 1280, width: 580, height: 644 },
                id24: { x: 752, y: 0, width: 580, height: 613 },
                id25: { x: 706, y: 752, width: 600, height: 580 },
                id26: { x: 706, y: 1334, width: 580, height: 610 },
                id27: { x: 0, y: 0, width: 750, height: 750 },
                id28: { x: 478, y: 1701, width: 94, height: 143 },
                id3: { x: 0, y: 1547, width: 281, height: 69 },
                id4: { x: 0, y: 1760, width: 173, height: 172 },
                id5: { x: 330, y: 1850, width: 133, height: 62 },
                id6: { x: 348, y: 1718, width: 128, height: 63 },
                id7: { x: 283, y: 1565, width: 146, height: 57 },
                id8: { x: 283, y: 1476, width: 151, height: 87 },
                id9: { x: 175, y: 1850, width: 153, height: 92 }
            }
        }, {
            id: "railTiles0",
            file: "images/railTiles0_154x159.png"
        }, {
            id: "railTiles1",
            file: "images/railTiles1_154x159.png"
        }, {
            id: "railTiles2",
            file: "images/railTiles2_154x159.png"
        }, {
            id: "railTiles3",
            file: "images/railTiles3_154x159.png"
        }, {
            id: "uiBg0",
            file: "images/uiBg0.jpg"
        }, {
            id: "uiBg1",
            file: "images/uiBg1.jpg"
        }, {
            id: "uiBg2",
            file: "images/uiBg2.jpg"
        }, {
            id: "uiBg3",
            file: "images/uiBg3.jpg"
        }, {
            id: "titleLogo",
            file: "images/title/" + curLang + ".png"
        }, {
            id: "showLogo",
            file: "images/logo/" + curLang + ".png"
        }, {
            id: "langText",
            file: "json/text.json"
        }, {
            id: "electric",
            file: "images/electric_174x59.png",
            oAnims: {
                loop: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
            }
        }], ctx, canvas.width, canvas.height);
    oImageIds.menuBut = "id0";
    oImageIds.menuButOver = "id1";
    oImageIds.infoBut = "id2";
    oImageIds.infoButOver = "id3";
    oImageIds.muteBut1 = "id4";
    oImageIds.muteBut1Over = "id5";
    oImageIds.muteBut0 = "id6";
    oImageIds.muteBut0Over = "id7";
    oImageIds.playBut = "id8";
    oImageIds.playButOver = "id9";
    oImageIds.backBut = "id10";
    oImageIds.backButOver = "id11";
    oImageIds.train1 = "id0";
    oImageIds.trainShadow1 = "id1";
    oImageIds.arrow0 = "id2";
    oImageIds.signPanel1 = "id3";
    oImageIds.overHighlight = "id4";
    oImageIds.train0 = "id5";
    oImageIds.train2 = "id6";
    oImageIds.train3 = "id7";
    oImageIds.trainShadow0 = "id8";
    oImageIds.trainShadow2 = "id9";
    oImageIds.trainShadow3 = "id10";
    oImageIds.score0 = "id11";
    oImageIds.score1 = "id12";
    oImageIds.signPanel0 = "id13";
    oImageIds.signPanel2 = "id14";
    oImageIds.signPanel3 = "id15";
    oImageIds.cloud = "id16";
    oImageIds.tutPanel = "id17";
    oImageIds.icon0 = "id18";
    oImageIds.icon1 = "id19";
    oImageIds.icon2 = "id20";
    oImageIds.icon3 = "id21";
    oImageIds.zoom0 = "id22";
    oImageIds.zoom1 = "id23";
    oImageIds.zoom2 = "id24";
    oImageIds.zoom3 = "id25";
    oImageIds.zoom4 = "id26";
    oImageIds.focus = "id27";
    oImageIds.arrow1 = "id28";
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
            if (train.solvedState == 0) {
                userInput.removeHitArea("gameTouch");
                updateGameTouch();
            }
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
        curChugLoop = sound.play(_id);
        sound.loop(true, curChugLoop);
        sound.volume(_vol, curChugLoop);
    }
}
function stopLoopSound() {
    sound.stop(curChugLoop);
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
                music.volume(.75);
            }
            else {
                music.volume(.5);
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
