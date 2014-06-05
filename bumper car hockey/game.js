// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011
"use strict";

var car1_img_path = "./img/blue_tiny.png"; // 142 x 73 pixels
var car2_img_path = "./img/red_tiny.png"; // 146 x 67 pixels
var puck_img_path = "./img/tron_mini_disc.png"; // 46 x 47 pixels
var car_img_x_offset = 72;
var car_img_y_offset = 35;
var puck_img_offset = 23;
var canvas_width = 1750;
var canvas_height = 1000;
var player1_start_x = 320;
var player1_start_y = canvas_height / 2;
var player2_start_x = canvas_width - 620;
var player2_start_y = canvas_height / 2;
var accel_key_p1 = 87;  // 'W' key
var backup_key_p1 = 83; // 'S' key
var left_key_p1 = 65;   // 'A' key
var right_key_p1 = 68;  // 'D' key
var accel_key_p2 = 38;  // Up arrow
var backup_key_p2 = 40; // Down arrow
var left_key_p2 = 37;   // Left arrow
var right_key_p2 = 39;  // Right arrow
var COLLISION_COOLDOWN = 5;
var NUM_PERIODS = 3;
var PERIOD_LENGTH = 120; // seconds

window.requestAnimFrame = (function () {
	return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = [];
    this.downloadQueue = [];
}

AssetManager.prototype.queueDownload = function (path) {
	console.log(path.toString());
    this.downloadQueue.push(path);
};

AssetManager.prototype.isDone = function () {
    return (this.downloadQueue.length === this.successCount + this.errorCount);
};

AssetManager.prototype.downloadAll = function (callback) {
    if (this.downloadQueue.length === 0) window.setTimeout(callback, 100);
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function () {
            console.log("dun: " + this.src.toString());
            that.successCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.addEventListener("error", function () {
            that.errorCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.src = path;
        this.cache[path] = img;
    }
};

AssetManager.prototype.getAsset = function(path){
    return this.cache[path];
};

function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function () {
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
    this.wallLastTimestamp = wallCurrent;

    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
};

function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.click = null;
    this.mouse = null;
    // this.wheel = null;
    this.keydown = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
}

GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();
    this.timer = new Timer();
    console.log('game initialized');
};

GameEngine.prototype.start = function () {
    console.log("starting game");
    var that = this;
    // that.countdown(PERIOD_LENGTH);
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
};

GameEngine.prototype.startInput = function () {
    console.log('Starting input');

    var getXandY = function (e) {
        var x = e.clientX - that.ctx.canvas.getBoundingClientRect().left;
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top;
		return { x: x, y: y };
    };

    var that = this;
    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
        // console.log("click[x=" + that.click.x + ",y=" + that.click.y + "]");
    }, false);
    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
        //console.log("mouse[x=" + that.mouse.x + ",y=" + that.mouse.y + "]");
    }, false);
    /*this.ctx.canvas.addEventListener("mousewheel", function (e) {
        that.wheel = e;
    }, false);*/
    
    this.ctx.canvas.addEventListener("keydown", function (e) {
        switch (e.which) {
        	case accel_key_p1:
	        	e.preventDefault();
	        	that.cars[0].pressedKeys[0] = 'accel';
	        	break;
	        case backup_key_p1:
                e.preventDefault();
                that.cars[0].pressedKeys[1] = 'backup';
                break;
            case left_key_p1:
                e.preventDefault();
                that.cars[0].pressedKeys[2] = 'left';
                break;
            case right_key_p1:
                e.preventDefault();
                that.cars[0].pressedKeys[3] = 'right';
                break;
	        case accel_key_p2:
                e.preventDefault();
                that.cars[1].pressedKeys[0] = 'accel';
                break;
	        case backup_key_p2:
                e.preventDefault();
                that.cars[1].pressedKeys[1] = 'backup';
                break;
	        case left_key_p2:
                e.preventDefault();
                that.cars[1].pressedKeys[2] = 'left';
                break;
        	case right_key_p2:
                e.preventDefault();
                that.cars[1].pressedKeys[3] = 'right';
                break;
        	default:
        		//do nothing
        }
    }, false);
    
    this.ctx.canvas.addEventListener("keyup", function (e) {
        switch (e.which) {
        	case accel_key_p1:
                e.preventDefault();
                that.cars[0].pressedKeys[0] = '';
                break;
            case backup_key_p1:
                e.preventDefault();
                that.cars[0].pressedKeys[1] = '';
                break;
            case left_key_p1:
                e.preventDefault();
                that.cars[0].pressedKeys[2] = '';
                break;
            case right_key_p1:
                e.preventDefault();
                that.cars[0].pressedKeys[3] = '';
                break;
            case accel_key_p2:
                e.preventDefault();
                that.cars[1].pressedKeys[0] = '';
                break;
            case backup_key_p2:
                e.preventDefault();
                that.cars[1].pressedKeys[1] = '';
                break;
            case left_key_p2:
                e.preventDefault();
                that.cars[1].pressedKeys[2] = '';
                break;
            case right_key_p2:
                e.preventDefault();
                that.cars[1].pressedKeys[3] = '';
                break;
        	default:
        		// do nothing
        }
    }, false);
    console.log('Input started');
};

GameEngine.prototype.addEntity = function (entity) {
    console.log('added entity');
    this.entities.push(entity);
};

GameEngine.prototype.draw = function (drawCallback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    if (drawCallback) {
        drawCallback(this);
    }
    this.ctx.restore();
};

GameEngine.prototype.update = function () {
    var entitiesCount = this.entities.length;
	for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];
        if (!entity.removeFromWorld) {
            entity.update();
        }
    }
    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
};

GameEngine.prototype.loop = function () {
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    this.click = null;
    // this.wheel = null;
    this.keydown = null;
};

GameEngine.prototype.reset = function () {
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].reset();
    }
};

function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function () {
};

Entity.prototype.reset = function () {
};

Entity.prototype.draw = function (ctx) {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.closePath();
    }
};

//////////////////////////////
//// START BUMPIN CLASSES ////

function drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.closePath();
}

function Car(game, x, y, player_num, img_path) {
	this.player_num = player_num;
	this.img_path = img_path;
	this.velX = 0;
	this.velY = 0;
	this.acceleration = 0.4;
	this.speedDecay = 0.96;
	this.rotation = 0;
	this.rotationStep = 4;
	this.maxSpeed = 8;
	this.backSpeed = 5;
    this.radius = 40;
    this.mass = 1;
    this.pressedKeys = [];
    this.bumps = 0;
    
    Entity.call(this, game, x, y);
}

Car.prototype = new Entity();

Car.prototype.varructor = Car;

Car.prototype.update = function () {
    if (this.game.running) {
        this.x += this.velX;
        this.y += this.velY;
    
        var width = this.game.ctx.canvas.width;
        var height = this.game.ctx.canvas.height;
        if ((this.x + this.radius > width && this.velX > 0) || (this.x - this.radius < 0 && this.velX < 0)) {
            this.velX *= -1;
            this.x += this.velX;
        }
        if ((this.y + this.radius > height && this.velY > 0) || (this.y - this.radius < 0 && this.velY < 0)) {
            this.velY *= -1;
            this.y += this.velY;
        }
    
        var speed = Math.sqrt(Math.pow(this.velX, 2) + Math.pow(this.velY, 2));
    
        if (speed > 0.3) {
            speed *= this.speedDecay;
            this.velX *= this.speedDecay;
            this.velY *= this.speedDecay;
        } else {
            this.velX = this.velY = speed = 0;
        }
    
        for (var i = 0; i < this.pressedKeys.length; i++) {
            switch (this.pressedKeys[i]) {
                case 'accel':
                    speed += this.acceleration;
                    this.velX += this.acceleration * Math.sin(this.rotation * (Math.PI/180));
                    this.velY += this.acceleration * Math.cos(this.rotation * (Math.PI/180)) * -1;
                    break;
                case 'backup':
                    speed -= this.backSpeed;
                    this.velX -= this.acceleration * Math.sin(this.rotation * (Math.PI/180));
                    this.velY -= this.acceleration * Math.cos(this.rotation * (Math.PI/180)) * -1;
                    break;
                case 'left':
                    if (speed > 0.3) {
                        this.rotation -= this.rotationStep * (speed / this.maxSpeed);
                    }
                    break;
                case 'right':
                    if (speed > 0.3) {
                        this.rotation += this.rotationStep * (speed / this.maxSpeed);
                    }
                    break;
                default:
                // do nothing
            }
        }
    }

};

Car.prototype.draw = function (ctx) {
    ctx.save();
	ctx.translate(this.x, this.y);
	ctx.rotate(this.rotation * (Math.PI/180));
	ctx.drawImage(ASSET_MANAGER.getAsset(this.img_path), -car_img_x_offset / 2, -car_img_y_offset / 2);
    ctx.restore();
    drawCircle(this.x, this.y, this.radius);
};

Car.prototype.reset = function () {
    this.velX = 0;
    this.velY = 0;
    if (this.player_num === 1) {
        this.rotation = 90;
        this.x = player1_start_x;
        this.y = player1_start_y;
    } else { //player_num === 2
        this.rotation = 270;
        this.x = player2_start_x;
        this.y = player2_start_y;
    }
    
};

Animation.prototype.drawFrame = function(tick, ctx, x, y, scaleBy) {
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    var index = this.currentFrame();
    var locX = x - (this.frameWidth/2) * scaleBy;
    var locY = y - (this.frameHeight/2) * scaleBy;
    ctx.drawImage(this.spriteSheet,
                  index*this.frameWidth, 0, // source from sheet
                  this.frameWidth, this.frameHeight,
                  locX, locY,
                  this.frameWidth*scaleBy,
                  this.frameHeight*scaleBy);
}

Animation.prototype.currentFrame = function() {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function() {
    return (this.elapsedTime >= this.totalTime);
}

function DustCloud(game, x, y) {
	Entity.call(this, game, x, y);
	this.sprite = ASSET_MANAGER.getAsset('smoke.png');
	this.animation = new Animation(this.sprite, 48, .05)
}

DustCloud.prototype = new Entity();
DustCloud.prototype.constructor = DustCloud;

DustCloud.prototype.update = function() {
	Entity.prototype.update.call(this);
	
	if (this.animation.isDone()) {
		this.removeFromWorld = true;
		return;
	}
}

DustCloud.prototype.draw = function(ctx) {
	this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y, this.ScaleFactor());
	
	Entity.prototype.draw.call(this, ctx);
}


function Puck(game, x, y) {
    Entity.call(this, game, x, y);
    this.img_offset = 23;
    this.velX = 0;
    this.velY = 0;
    this.collided = 0;
    this.drag = -.15;
    this.radius = 20;
    this.mass = .5;
}

Puck.prototype = new Entity();

Puck.prototype.constructor = Puck;

function calcDistance(ent1, ent2) {
    return Math.sqrt(Math.pow(ent1.x - ent2.x, 2) + Math.pow(ent1.y - ent2.y, 2));
}

function findAngle(x, y) {
    var ang;
    if (x === 0) {
        ang = Math.PI/2;
    } else {
        ang = Math.atan(y/x);
    }
    if (x < 0 && y < 0) {
        ang += Math.PI;
    } else if (x < 0) {
        ang += Math.PI;
    } else if (y < 0) {
        ang += 2* Math.PI;
    }
    return ang;
}

Puck.prototype.update = function () {
    if (!this.game.running) return;
    this.x += this.velX + this.drag * this.velX;
    this.y += this.velY + this.drag * this.velY;
    var width = this.game.ctx.canvas.width;
    var height = this.game.ctx.canvas.height;

    if ((this.x + this.radius > width && this.velX > 0) || (this.x - this.radius < 0 && this.velX < 0)) {
        this.velX *= -1;
    }
    if ((this.y + this.radius > height && this.velY > 0) || (this.y - this.radius < 0 && this.velY < 0)) {
        this.velY *= -1;
    }

    if (this.game.cars.length > 0) {
        for (var i = 0, len = this.game.cars.length; i < len; i++) {
            var car = this.game.cars[i];
            if (calcDistance(this, car) < this.radius + car.radius && this.collided === 0) {
                // console.log(i + ": distance: " + calcDistance(this, car));
                this.doCollision(car);
                car.bumps++;
                //break;
            }
        }
    }
};

Puck.prototype.doCollision = function (ent) {
    var distance = calcDistance(this, ent);
    if (distance > this.radius + ent.radius || this.collided > 0) {
        return false;
    } else {
        this.collided = COLLISION_COOLDOWN;

        var xDiff = this.x - ent.x;
        var yDiff = this.y - ent.y;
        var collisionAngle = findAngle(xDiff, yDiff);

        var travelAngle = findAngle(this.velX, this.velY);
        var travelAngle2 = findAngle(ent.velX, ent.velY);

        var m1 = this.mass;
        var m2 = ent.mass;
        var v1 = Math.sqrt(Math.pow(this.velX, 2) + Math.pow(this.velY, 2));
        var v2 = Math.sqrt(Math.pow(ent.velX, 2) + Math.pow(ent.velY, 2));

        // equations from http://williamecraver.wix.com/elastic-equations
        var newVelX = ((v1*Math.cos(travelAngle - collisionAngle) * (this.mass - ent.mass) + 2*m2*v2*Math.cos(travelAngle2 - collisionAngle)) /
            (m1 + m2)) * Math.cos(collisionAngle) + v1*Math.sin(travelAngle - collisionAngle)*Math.cos(collisionAngle + Math.PI/2);
        var newVelY = ((v1*Math.cos(travelAngle - collisionAngle) * (this.mass - ent.mass) + 2*m2*v2*Math.cos(travelAngle2 - collisionAngle)) /
            (m1 + m2)) * Math.sin(collisionAngle) + v1*Math.sin(travelAngle - collisionAngle)*Math.sin(collisionAngle + Math.PI/2);

        var newVelX2 = ((v2*Math.cos(travelAngle2 - collisionAngle) * (ent.mass - this.mass) + 2*m1*v1*Math.cos(travelAngle - collisionAngle)) /
            (m1 + m2)) * Math.cos(collisionAngle) + v2*Math.sin(travelAngle2 - collisionAngle)*Math.cos(collisionAngle + Math.PI/2);
        var newVelY2 = ((v1*Math.cos(travelAngle2 - collisionAngle) * (ent.mass - this.mass) + 2*m1*v1*Math.cos(travelAngle - collisionAngle)) /
            (m1 + m2)) * Math.sin(collisionAngle) + v2*Math.sin(travelAngle2 - collisionAngle)*Math.sin(collisionAngle + Math.PI/2);

        this.velX = newVelX;
        this.velY = newVelY;
        ent.velX = newVelX2;
        ent.velY = newVelY2;

        return true;
        this.game.addEntity(new DustCloud(this.game, this.x, this.y));

    }
};

Puck.prototype.draw = function (ctx) {
    ctx.drawImage(ASSET_MANAGER.getAsset(puck_img_path), this.x - this.img_offset, this.y - this.img_offset);
    var color = "green";
    if (this.collided > 0) {
        color = "red";
        this.collided--;
    }
    drawCircle(this.x, this.y, this.radius, color);
};

Puck.prototype.reset = function () {
    this.x = canvas_width/2;
    this.y = canvas_height/2;
    this.velX = 0;
    this.velY = 0; 
};

function ScoreBoard(game, x, y, clock, frame, score1, score2) {
    this.clock = clock;
    this.frame = frame;
    this.score1 = score1;
    this.score2 = score2;
    this.elapsedTime = 0;
    Entity.call(this, game, x, y);
}

ScoreBoard.prototype = new Entity();
ScoreBoard.prototype.constructor = ScoreBoard;

ScoreBoard.prototype.update = function () {
    if (!this.game.running) return;
    
    this.elapsedTime += this.game.clockTick;
    
    if (this.elapsedTime >= 1) {
        this.game.timeRemaining--;
        this.elapsedTime = 0;
    }
    
    var minutes = Math.floor(this.game.timeRemaining / 60);
    var seconds = this.game.timeRemaining % 60;
    
    this.clock.innerHTML =  minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    this.frame.innerHTML = "PERIOD: " + this.game.period + "/" + NUM_PERIODS;
    this.score1.innerHTML = this.game.cars[0].bumps;
    this.score2.innerHTML = this.game.cars[1].bumps;

    if (this.game.timeRemaining == 0) this.game.reset();

};

function PlayGame(game, x, y) {
    Entity.call(this, game, x, y);
}

PlayGame.prototype = new Entity();
PlayGame.prototype.constructor = PlayGame;

PlayGame.prototype.reset = function () {
    this.game.running = false;
    this.game.timeRemaining = PERIOD_LENGTH;
    this.game.period++;
};

PlayGame.prototype.update = function () {
    if (this.game.click && this.game.timeRemaining > 0 && this.game.period <= NUM_PERIODS) this.game.running = true;
};

PlayGame.prototype.draw = function (ctx) {
    if (!this.game.running) {
        ctx.font = "24pt Impact";
        ctx.fillStyle = "white";
        if (this.game.mouse) { ctx.fillStyle = "pink"; }
        if (this.game.period <= 3) {
            ctx.fillText("Click to GET BUMPIN'!", this.x, this.y);
        } else {
            if (this.game.cars[0].bumps > this.game.cars[1].bumps) {
                ctx.fillText("Player 1 is the WINNER!", this.x-15, this.y);
            } else if (this.game.cars[0].bumps < this.game.cars[1].bumps) {
                ctx.fillText("Player 2 is the WINNER!", this.x-15, this.y);
            } else {
                ctx.fillText("TIE GAME!!!", this.x+62, this.y);
            }
        }
    }
};

// the "main" code begins here
var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload(car1_img_path);
ASSET_MANAGER.queueDownload(car2_img_path);
ASSET_MANAGER.queueDownload(puck_img_path);

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');
    
    var gameEngine = new GameEngine();
    
    gameEngine.cars = [];
    gameEngine.puck = null;
    gameEngine.timeRemaining = PERIOD_LENGTH;
    gameEngine.period = 1;
    gameEngine.running = false;
    
    var puck = new Puck(gameEngine, canvas_width / 2, canvas_height / 2);
    
    var player1 = new Car(gameEngine, player1_start_x, player1_start_y, 1, car1_img_path);
    player1.rotation = 90;
    var player2 = new Car(gameEngine, player2_start_x, player2_start_y, 2, car2_img_path);
    player2.rotation = 270;
    
    var pg = new PlayGame(gameEngine, 484, 235);
    
    var sb = new ScoreBoard(gameEngine, 0, 0, document.getElementById('clock'), document.getElementById('period'), 
                                              document.getElementById('score1'), document.getElementById('score2'));
    
	gameEngine.addEntity(puck);
    gameEngine.addEntity(player1);
    gameEngine.addEntity(player2);
    gameEngine.addEntity(pg);
    gameEngine.addEntity(sb);
    gameEngine.cars[0] = player1;
    gameEngine.cars[1] = player2;
    gameEngine.init(ctx);
    gameEngine.start();
    ctx.canvas.focus();
});
