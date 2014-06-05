// Parts of this game's shell were shamelessly stolen from Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

var car1_img_path = "./img/blue_tiny.png"; // 142 x 73 pixels
var car2_img_path = "./img/red_tiny.png"; // 146 x 67 pixels
var puck_img_path = "./img/tron_mini_disc.png"; // 46 x 47 pixels
var red_bumper_path = "./img/red_bumper.png";
var goalie_img_path = "./img/old_disc_orange.png";
var goalie_img_path_hit = "./img/old_disc_blue.png";
var dust_img_path = "./img/smoke.png";
var dust_img_offset = 48;
var car_img_x_offset = 72;
var car_img_y_offset = 35;
var puck_img_offset = 23;
var canvas_width = 1750;
var canvas_height = 1000;
var player1_start_x = 410;
var player1_start_y = 480;
var player2_start_x = 897;
var player2_start_y = 480;
var PUCK_START_X = 653;
var PUCK_START_Y = 480;
var accel_key_p1 = 87;  // 'W' key
var backup_key_p1 = 83; // 'S' key
var left_key_p1 = 65;   // 'A' key
var right_key_p1 = 68;  // 'D' key
var accel_key_p2 = 38;  // Up arrow
var backup_key_p2 = 40; // Down arrow
var left_key_p2 = 37;   // Left arrow
var right_key_p2 = 39;  // Right arrow

var COLLISION_COOLDOWN = 1;
var BUMPER_COOLDOWN = 8;

var NUM_PERIODS = 1;
var PERIOD_LENGTH = 60; // seconds

var DRAW_DEBUG = false;
var TICK_FACTOR = 40;

var ARENA_LEFT = 133;
var ARENA_RIGHT = 1193;
var ARENA_TOP = 56;
var ARENA_BOTTOM = 940;
var GOAL_TOP = 402;
var GOAL_BOTTOM = 562;

var CAR_LENGTH = 0;
var CAR_RADIUS = 36;
var PUCK_RADIUS = 30;
var BUMPER_RADIUS = 54;
var GOALIE_RADIUS = 24;
var CAR_MASS = 1;
var PUCK_MASS = 0.7;
var BUMPER_MASS = 1;
var GOALIE_MASS = 0.7;

var GOALIES_ENABLED = true;
var GOALIES_REACTION = 80;
var GOALIES_MAX_SPEED = 0.8;
var GOALIES_TOLERANCE = 2;
var GOALIES_RANGE_X = 200;
var GOALIES_RANGE_Y = 140;

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
	//console.log(path.toString());
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
            //console.log("dun: " + this.src.toString());
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
    this.maxStep = 0.1;
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
    this.cars = [];
    this.puck = null;
    this.bumpers = [];
    this.scores = [0, 0];
    this.playGame = null;
}

GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();
    this.timer = new Timer();
    console.log('Game initialized.');
};

GameEngine.prototype.start = function () {
    console.log("Starting game.");
    var that = this;
    // that.countdown(PERIOD_LENGTH);
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
};

GameEngine.prototype.startInput = function () {
    console.log('Starting input.');

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
    console.log('Input started.');
};

GameEngine.prototype.addEntity = function (entity) {
    console.log('Added entity.');
    this.entities.push(entity);
};

GameEngine.prototype.draw = function (drawCallback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    if (DRAW_DEBUG) {
        // Draw arena outline
        this.ctx.strokeStyle = "green";
        this.ctx.strokeRect(ARENA_LEFT, ARENA_TOP, ARENA_RIGHT - ARENA_LEFT, ARENA_BOTTOM - ARENA_TOP);
        // Draw goal lines
        this.ctx.strokeStyle = "yellow";
        this.ctx.strokeRect(ARENA_LEFT, GOAL_TOP, 2, GOAL_BOTTOM - GOAL_TOP);
        this.ctx.strokeRect(ARENA_RIGHT, GOAL_TOP, 2, GOAL_BOTTOM - GOAL_TOP);
    }

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
        var ent = this.entities[i];
        if (! (ent instanceof Car || ent instanceof Puck)) {
            if (!ent.removeFromWorld) {
                ent.update();
            }
        }
    }

    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }

    // Move cars
//    for (var i = 0; i < this.cars.length; i++) {
//        this.cars[i].update();
//    }
    // Collide cars w/each other
    for (var i = 0; i < this.cars.length; i++) {
        this.cars[i].update();
    }
    for (var i = 0; i < this.cars.length; i++) {
        for (var j = 0; j < this.cars.length; j++) {
            if (i === j) { continue; }
            this.cars[i].doCollision(this.cars[j]);
        }
    }
    for (var i = 0; i < this.cars.length; i++) {
        var c = this.cars[i];
        if (c.newVelX !== null && c.newVelY !== null) {
            c.velX = c.newVelX;
            c.velY = c.newVelY;
        }
        c.newVelX = c.newVelY = null;
    }
    // Collide cars w/puck
    for (var i = 0; i < this.cars.length; i++) {
        this.cars[i].doCollision(this.puck);
    }
    // Collide cars w/bumpers
    for (var i = 0; i < this.cars.length; i++) {
        for (var j = 0; j < this.bumpers.length; j++) {
            this.cars[i].doCollision(this.bumpers[j]);
        }
    }
    // Collide puck w/bumpers
    for (var i = 0; i < this.bumpers.length; i++) {
        this.puck.doCollision(this.bumpers[i]);
    }
    // Move puck
    this.puck.update();

};

GameEngine.prototype.loop = function () {
    this.clockTick = this.timer.tick();
    this.gameDelta = this.clockTick * TICK_FACTOR;
    this.update();
    this.draw();
    this.click = null;
    // this.wheel = null;
    this.keydown = null;
};

GameEngine.prototype.scoreGoal = function(teamNum) {
    this.scores[teamNum]++;
    this.reset();
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

// ANIMATION
function Animation(spriteSheet, frameWidth, frameDuration, loop) {
    this.spriteSheet = spriteSheet;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight = this.spriteSheet.height;
    this.totalTime = (this.spriteSheet.width / this.frameWidth) * this.frameDuration;
    this.elapsedTime = 0;
    this.loop = loop;
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
    this.sprite = ASSET_MANAGER.getAsset(dust_img_path);
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
    this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y);

    Entity.prototype.draw.call(this, ctx);
}

//////////////////////////////
//// START BUMPIN CLASSES ////

function drawCircle(ctx, x, y, radius, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.closePath();
}

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

// CAR
function Car(game, x, y, player_num, img_path, rotation) {
	this.player_num = player_num;
	this.img_path = img_path;
	this.velX = 0;
	this.velY = 0;
    this.newVelX = null;
    this.newVelY = null;
	this.acceleration = 0.4;
	this.speedDecay = 0.96;
	this.rotation = 0;
	this.rotationStep = 4;
	this.maxSpeed = 8;
	this.backSpeed = 5;
    this.radius = CAR_RADIUS;
    this.length = CAR_LENGTH;
    this.mass = CAR_MASS;
    this.pressedKeys = [];
    this.bumps = 0;
    this.collided = 0;
    this.startx = x;
    this.starty = y;
    this.startRotation = rotation;
    
    Entity.call(this, game, x, y);
}

Car.prototype = new Entity();

Car.prototype.constructor = Car;

Car.prototype.update = function () {
    var tick_factor = this.game.gameDelta;
    if (this.game.running) {
        this.x += this.velX * tick_factor;
        this.y += this.velY * tick_factor;
    
        var width = this.game.ctx.canvas.width;
        var height = this.game.ctx.canvas.height;
        if ((this.x + this.radius > ARENA_RIGHT && this.velX > 0) || (this.x - this.radius < ARENA_LEFT && this.velX < 0)) {
            this.velX *= -1;
            this.x += this.velX * tick_factor;
        }
        if ((this.y + this.radius > ARENA_BOTTOM && this.velY > 0) || (this.y - this.radius < ARENA_TOP && this.velY < 0)) {
            this.velY *= -1;
            this.y += this.velY * tick_factor;
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

Car.prototype.doCollision = function(ent) {
    if (ent instanceof Bumper) {
        return this.doBumperCollision(ent);
    } else if (ent instanceof Puck) {
        return this.doPuckCollision(ent);
    } else if (ent instanceof Car) {
        return this.doCarCollision(ent);
    }
};

Car.prototype.doBumperCollision = function(ent) {
    var distance = calcDistance(this, ent);
    if (distance > this.radius + ent.radius || this.collided > 0) {
        return false;
    } else {
        //this.collided = COLLISION_COOLDOWN;
        var xDiff = this.x - ent.x;
        var yDiff = this.y - ent.y;
        var collisionAngle = findAngle(xDiff, yDiff);

        var travelAngle = findAngle(this.velX, this.velY);
        var travelAngle2 = findAngle(-xDiff, -yDiff);

        // Check if car is actually traveling into bumper
        var newColl = collisionAngle - (collisionAngle > Math.PI ? 2 * Math.PI : 0);
        var newTrav = findAngle(this.velX - ent.velX, this.velY - ent.velY);
        newTrav = newTrav - (newTrav > Math.PI ? 2 * Math.PI : 0);
        if (Math.abs(newTrav - newColl) < Math.PI / 2) {
            console.log("False collision! Coll: " + newColl + " Trav: " + newTrav);
            return false;
        }

        var m1 = this.mass;
        var m2 = this.mass;
        var v1 = Math.sqrt(Math.pow(this.velX, 2) + Math.pow(this.velY, 2));
        var v2 = 0;

        // equations from http://williamecraver.wix.com/elastic-equations
        var newVelX2 = ((v2*Math.cos(travelAngle2 - collisionAngle) * (ent.mass - this.mass) + 2*m1*v1*Math.cos(travelAngle - collisionAngle)) /
            (m1 + m2)) * Math.cos(collisionAngle) + v2*Math.sin(travelAngle2 - collisionAngle)*Math.cos(collisionAngle + Math.PI/2);
        var newVelY2 = ((v1*Math.cos(travelAngle2 - collisionAngle) * (ent.mass - this.mass) + 2*m1*v1*Math.cos(travelAngle - collisionAngle)) /
            (m1 + m2)) * Math.sin(collisionAngle) + v2*Math.sin(travelAngle2 - collisionAngle)*Math.sin(collisionAngle + Math.PI/2);

        this.velX = -newVelX2;
        this.velY = -newVelY2;

        ent.collided = this.game.timer.wallLastTimestamp;

        return true;
    }
};

Car.prototype.doPuckCollision = function(ent) {
    var distance = calcDistance(this, ent);
    if (distance > this.radius + ent.radius || this.collided > 0) {
        return false;
    } else {
        //this.collided = COLLISION_COOLDOWN;
        var xDiff = this.x - ent.x;
        var yDiff = this.y - ent.y;
        var collisionAngle = findAngle(xDiff, yDiff);

        var travelAngle = findAngle(this.velX, this.velY);
        var travelAngle2 = findAngle(ent.velX, ent.velY);
        var travelDelta = findAngle(this.velX - ent.velX, this.velY - ent.velY);

        // Check if car/puck are actually traveling into each other
        var newColl = collisionAngle - (collisionAngle > Math.PI ? 2 * Math.PI : 0);
        var newTrav = findAngle(this.velX - ent.velX, this.velY - ent.velY);
        newTrav = newTrav - (newTrav > Math.PI ? 2 * Math.PI : 0);
        if (Math.abs(newTrav - newColl) < Math.PI / 2) {
            console.log("False collision! Coll: " + newColl + " Trav: " + newTrav);
            return false;
        }

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
    }
};

Car.prototype.doCarCollision = function(ent) {
    var distance = calcDistance(this, ent);
    if (distance > this.radius + ent.radius || this.collided > 0) {
        return false;
    } else {
        //this.collided = COLLISION_COOLDOWN;
        var xDiff = this.x - ent.x;
        var yDiff = this.y - ent.y;
        var collisionAngle = findAngle(xDiff, yDiff);

        var travelAngle = findAngle(this.velX, this.velY);
        var travelAngle2 = findAngle(ent.velX, ent.velY);

        var travelDelta = findAngle(this.velX - ent.velX, this.velY - ent.velY);

        // Check if cars are actually traveling into each other
        var newColl = collisionAngle - (collisionAngle > Math.PI ? 2 * Math.PI : 0);
        var newTrav = findAngle(this.velX - ent.velX, this.velY - ent.velY);
        newTrav = newTrav - (newTrav > Math.PI ? 2 * Math.PI : 0);
        if (Math.abs(newTrav - newColl) < Math.PI / 2) {
            console.log("False collision! Coll: " + newColl + " Trav: " + newTrav);
            return false;
        }

        var m1 = this.mass;
        var m2 = ent.mass;
        var v1 = Math.sqrt(Math.pow(this.velX, 2) + Math.pow(this.velY, 2));
        var v2 = Math.sqrt(Math.pow(ent.velX, 2) + Math.pow(ent.velY, 2));

        // equations from http://williamecraver.wix.com/elastic-equations
        var newVelX = ((v1*Math.cos(travelAngle - collisionAngle) * (this.mass - ent.mass) + 2*m2*v2*Math.cos(travelAngle2 - collisionAngle)) /
            (m1 + m2)) * Math.cos(collisionAngle) + v1*Math.sin(travelAngle - collisionAngle)*Math.cos(collisionAngle + Math.PI/2);
        var newVelY = ((v1*Math.cos(travelAngle - collisionAngle) * (this.mass - ent.mass) + 2*m2*v2*Math.cos(travelAngle2 - collisionAngle)) /
            (m1 + m2)) * Math.sin(collisionAngle) + v1*Math.sin(travelAngle - collisionAngle)*Math.sin(collisionAngle + Math.PI/2);

        this.newVelX = newVelX;
        this.newVelY = newVelY;

        return true;
    }
};

Car.prototype.draw = function (ctx) {
    // NOTE: everything is rotated 90 degrees here (x is y, y is x)
    ctx.save();
	ctx.translate(this.x, this.y);
	ctx.rotate(this.rotation * (Math.PI/180));
	ctx.drawImage(ASSET_MANAGER.getAsset(this.img_path), -1 * this.radius, -1 * this.radius - this.length / 2, this.radius * 2, this.length + this.radius * 2);
    if (DRAW_DEBUG) {
        var color = "green";
        drawCircle(ctx, 0, this.length/2, this.radius, color);
        drawCircle(ctx, 0, -1 * this.length/2, this.radius, color);
        ctx.strokeStyle = color;
        ctx.strokeRect(-1 * this.radius, -1 * this.length / 2, this.radius*2, this.length);
    }
    ctx.restore();
};

Car.prototype.reset = function () {
    this.velX = 0;
    this.velY = 0;
    this.x = this.startx;
    this.y = this.starty;
    this.rotation = this.startRotation;
};


// PUCK
function Puck(game, x, y) {
    Entity.call(this, game, x, y);
    this.startx = x;
    this.starty = y;
    this.velX = 0;
    this.velY = 0;
    this.newVelX = 0;
    this.newVelY = 0;
    this.collided = 0;
    this.drag = -.15;
    this.radius = PUCK_RADIUS;
    this.mass = PUCK_MASS;
}

Puck.prototype = new Entity();

Puck.prototype.constructor = Puck;

Puck.prototype.update = function () {
    var tick_factor = this.game.gameDelta;

    if (!this.game.running) return;
    this.x += (this.velX + this.drag * this.velX) * tick_factor;
    this.y += (this.velY + this.drag * this.velY) * tick_factor;
    var width = this.game.ctx.canvas.width;
    var height = this.game.ctx.canvas.height;

    if (((this.x + this.radius > ARENA_RIGHT && this.velX > 0) || (this.x - this.radius < ARENA_LEFT && this.velX < 0))
            && (this.y < GOAL_TOP || this.y > GOAL_BOTTOM)) {
        this.velX *= -1;
    }
    if ((this.y + this.radius > ARENA_BOTTOM && this.velY > 0) || (this.y - this.radius < ARENA_TOP && this.velY < 0)) {
        this.velY *= -1;
    }

    // GOOOOOOOOAAAAAAAAAAAAALLLLLLLLLLLLL
    if (this.x + this.radius < ARENA_LEFT) {
        this.game.scoreGoal(1);
    } else if (this.x - this.radius > ARENA_RIGHT) {
        this.game.scoreGoal(0);
    }

    this.collided = Math.max(this.collided - 1, 0);
};

Puck.prototype.doCollision = function (ent) {
    if (ent instanceof Bumper) {
        return this.doBumperCollision(ent);
    }
};

Puck.prototype.doBumperCollision = function (ent) {
    var distance = calcDistance(this, ent);
    if (distance > this.radius + ent.radius || this.collided > 0) {
        return false;
    } else {
        //this.collided = COLLISION_COOLDOWN;

        var xDiff = this.x - ent.x;
        var yDiff = this.y - ent.y;
        var collisionAngle = findAngle(xDiff, yDiff);

        var travelAngle = findAngle(this.velX, this.velY);
        var travelAngle2 = findAngle(-xDiff, -yDiff); //findAngle(-1 * this.velX, -1 * this.velY);

        // Check if car is actually traveling into bumper
        var newColl = collisionAngle - (collisionAngle > Math.PI ? 2 * Math.PI : 0);
        var newTrav = findAngle(this.velX - ent.velX, this.velY - ent.velY);
        newTrav = newTrav - (newTrav > Math.PI ? 2 * Math.PI : 0);
        if (Math.abs(newTrav - newColl) < Math.PI / 2) {
            console.log("False collision. Coll: " + newColl + " Trav: " + newTrav);
            return false;
        }

        var m1 = this.mass;
        var m2 = this.mass;
        var v1 = Math.sqrt(Math.pow(this.velX, 2) + Math.pow(this.velY, 2));
        var v2 = 0;

        // equations from http://williamecraver.wix.com/elastic-equations
        var newVelX2 = ((v2*Math.cos(travelAngle2 - collisionAngle) * (ent.mass - this.mass) + 2*m1*v1*Math.cos(travelAngle - collisionAngle)) /
            (m1 + m2)) * Math.cos(collisionAngle) + v2*Math.sin(travelAngle2 - collisionAngle)*Math.cos(collisionAngle + Math.PI/2);
        var newVelY2 = ((v1*Math.cos(travelAngle2 - collisionAngle) * (ent.mass - this.mass) + 2*m1*v1*Math.cos(travelAngle - collisionAngle)) /
            (m1 + m2)) * Math.sin(collisionAngle) + v2*Math.sin(travelAngle2 - collisionAngle)*Math.sin(collisionAngle + Math.PI/2);

        this.velX = -newVelX2;
        this.velY = -newVelY2;
        ent.collided = this.game.timer.wallLastTimestamp;

		this.game.addEntity(new DustCloud(this.game, this.x, this.y));
        return true;
    }
};

Puck.prototype.draw = function (ctx) {
    ctx.drawImage(ASSET_MANAGER.getAsset(puck_img_path), this.x - this.radius - 4, this.y - this.radius - 2, this.radius * 2 + 8, this.radius * 2 + 2);
    if (DRAW_DEBUG) {
        var color = "green";
        if (this.collided > 0) {
            color = "red";
        }
        drawCircle(ctx, this.x, this.y, this.radius, color);
    }
};

Puck.prototype.reset = function () {
    this.x = this.startx;
    this.y = this.starty;
    this.velX = 0;
    this.velY = 0; 
};


// BUMPER
function Bumper(game, x, y, radius) {
    Entity.call(this, game, x, y);
    this.radius = radius;
    this.mass = BUMPER_MASS;
    this.collided = 0;
    this.velX = 0;
    this.velY = 0;
}

Bumper.prototype = new Entity();

Bumper.prototype.constructor = Bumper;

Bumper.prototype.update = function() {
    //this.collided = Math.max(this.collided - 1, 0);
};

Bumper.prototype.draw = function(ctx) {
    if (this.game.timer.wallLastTimestamp - this.collided < BUMPER_COOLDOWN / 60 * 1000) {
        ctx.drawImage(ASSET_MANAGER.getAsset(red_bumper_path), this.x - this.radius - 2, this.y - this.radius - 2, this.radius * 2 + 4, this.radius * 2 + 4);
    }
    if (DRAW_DEBUG) {
        var color = "blue";
        drawCircle(ctx, this.x, this.y, this.radius, color);
    }
};

Bumper.prototype.reset = function() {}


// GOALIE
function Goalie(game, x, y, radius, num) {
    this.mass = GOALIE_MASS;
    this.starty = y;
    this.num = num;
    Bumper.call(this, game, x, y, radius);
}

Goalie.prototype = new Bumper();
Goalie.prototype.constructor = Goalie;

Goalie.prototype.update = function () {
    var puck = this.game.puck;

    if  (Math.abs(this.x - puck.x) < GOALIES_RANGE_X) {
        this.trackPuck();
    }
};

Goalie.prototype.trackPuck = function () { // this.x + 180
    var puck = this.game.puck;
    var rangeDiff = Math.abs(this.starty - puck.y);
    var yDiff = Math.abs(this.y - puck.y);

    if (rangeDiff < GOALIES_RANGE_Y && yDiff > GOALIES_TOLERANCE) {
        var d = calcDistance(this, puck);
        var react = Math.min(GOALIES_REACTION / d, GOALIES_MAX_SPEED);
        var react = this.y > puck.y ? -1 * react : react;

        this.y = Math.max(this.starty - GOALIES_RANGE_Y, Math.min(this.starty + GOALIES_RANGE_Y, this.y + react));
    }
};

Goalie.prototype.draw = function () {
    if (this.game.timer.wallLastTimestamp - this.collided < BUMPER_COOLDOWN / 60 * 1000) {
        ctx.drawImage(ASSET_MANAGER.getAsset(goalie_img_path_hit), this.x - this.radius - 1, this.y - this.radius - 1, this.radius * 2 + 2, this.radius * 2 + 2);
    } else {
        ctx.drawImage(ASSET_MANAGER.getAsset(goalie_img_path), this.x - this.radius -1 , this.y - this.radius - 1, this.radius * 2 + 2, this.radius * 2 + 2);
    }
    if (DRAW_DEBUG) {
        var color = "orange";
        drawCircle(ctx, this.x, this.y, this.radius, color);
    }
};

Goalie.prototype.reset = function () {
    this.y = this.starty;
};




/// === Scoring stuff === ///
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
    this.score1.innerHTML = this.game.scores[0];
    this.score2.innerHTML = this.game.scores[1];

    if (!this.game.running) return;
    
    this.elapsedTime += this.game.clockTick;
    
    if (this.elapsedTime >= 1) {
        this.game.timeRemaining--;
        this.elapsedTime -= 1;
    }
    
    var minutes = Math.floor(this.game.timeRemaining / 60);
    var seconds = this.game.timeRemaining % 60;
    
    this.clock.innerHTML =  minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    this.frame.innerHTML = "PERIOD: " + this.game.period + "/" + NUM_PERIODS;

    if (this.game.timeRemaining == 0) this.game.playGame.endGame();

};

function PlayGame(game, x, y) {
    Entity.call(this, game, x, y);
}

PlayGame.prototype = new Entity();
PlayGame.prototype.constructor = PlayGame;

PlayGame.prototype.reset = function () {
    this.game.running = false;
    //this.game.timeRemaining = PERIOD_LENGTH;
    //this.game.period++;
};

PlayGame.prototype.endGame = function() {
    this.game.running = false;
    this.game.timeRemaining = PERIOD_LENGTH;
    this.game.period++;

    if (this.game.scores[0] > this.game.scores[1]) {
        ctx.fillText("Player 1 is the WINNER!", this.x-15, this.y);
    } else if (this.game.cars[0].bumps < this.game.cars[1].bumps) {
        ctx.fillText("Player 2 is the WINNER!", this.x-15, this.y);
    } else {
        ctx.fillText("TIE GAME!!!", this.x+62, this.y);
    }
}

PlayGame.prototype.update = function () {
    if (this.game.click && this.game.timeRemaining > 0 && this.game.period <= NUM_PERIODS) this.game.running = true;
};

PlayGame.prototype.draw = function (ctx) {
    if (!this.game.running) {
        ctx.font = "24pt Impact";
        ctx.fillStyle = "white";
        if (this.game.mouse) { ctx.fillStyle = "pink"; }
        if (this.game.period <= NUM_PERIODS) {
            ctx.fillText("Click to GET BUMPIN'!", this.x, this.y);
        } else {
            if (this.game.scores[0] > this.game.scores[1]) {
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
ASSET_MANAGER.queueDownload(red_bumper_path);
ASSET_MANAGER.queueDownload(goalie_img_path);
ASSET_MANAGER.queueDownload(goalie_img_path_hit);
ASSET_MANAGER.queueDownload(dust_img_path);

ASSET_MANAGER.downloadAll(function () {
    //console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');
    
    var gameEngine = new GameEngine();

    gameEngine.timeRemaining = PERIOD_LENGTH;
    gameEngine.period = 1;
    gameEngine.running = false;
    
    var puck = new Puck(gameEngine, PUCK_START_X, PUCK_START_Y);
    
    var player1 = new Car(gameEngine, player1_start_x, player1_start_y, 1, car1_img_path, 90);
    player1.rotation = 90;
    var player2 = new Car(gameEngine, player2_start_x, player2_start_y, 2, car2_img_path, 270);
    player2.rotation = 270;

    var bumper1 = new Bumper(gameEngine, 412, 318, BUMPER_RADIUS);
    var bumper2 = new Bumper(gameEngine, 413, 655, BUMPER_RADIUS);
    var bumper3 = new Bumper(gameEngine, 899, 318, BUMPER_RADIUS);
    var bumper4 = new Bumper(gameEngine, 904, 656, BUMPER_RADIUS);
    var goal1 = new Bumper(gameEngine, ARENA_LEFT, GOAL_TOP, 1);
    var goal2 = new Bumper(gameEngine, ARENA_LEFT, GOAL_BOTTOM, 1);
    var goal3 = new Bumper(gameEngine, ARENA_RIGHT, GOAL_TOP, 1);
    var goal4 = new Bumper(gameEngine, ARENA_RIGHT, GOAL_BOTTOM, 1);
    
    var pg = new PlayGame(gameEngine, 484, 235);
    
    var sb = new ScoreBoard(gameEngine, 0, 0, document.getElementById('clock'), document.getElementById('period'), 
                                              document.getElementById('score1'), document.getElementById('score2'));
    
	gameEngine.addEntity(puck);
    gameEngine.addEntity(player1);
    gameEngine.addEntity(player2);
    gameEngine.addEntity(bumper1);
    gameEngine.addEntity(bumper2);
    gameEngine.addEntity(bumper3);
    gameEngine.addEntity(bumper4);
    gameEngine.addEntity(goal1);
    gameEngine.addEntity(goal2);
    gameEngine.addEntity(goal3);
    gameEngine.addEntity(goal4);
    gameEngine.addEntity(pg);
    gameEngine.addEntity(sb);
    gameEngine.playGame = pg;
    gameEngine.cars.push(player1);
    gameEngine.cars.push(player2);
    gameEngine.puck = puck;
    gameEngine.bumpers.push(bumper1);
    gameEngine.bumpers.push(bumper2);
    gameEngine.bumpers.push(bumper3);
    gameEngine.bumpers.push(bumper4);
    gameEngine.bumpers.push(goal1);
    gameEngine.bumpers.push(goal2);
    gameEngine.bumpers.push(goal3);
    gameEngine.bumpers.push(goal4);

    if (GOALIES_ENABLED) {
        var goalie1 = new Goalie(gameEngine, ARENA_LEFT + 150, player1_start_y, GOALIE_RADIUS, 1);
        var goalie2 = new Goalie(gameEngine, ARENA_RIGHT - 150, player1_start_y, GOALIE_RADIUS, 2);
        gameEngine.addEntity(goalie1);
        gameEngine.addEntity(goalie2);
        gameEngine.bumpers.push(goalie1);
        gameEngine.bumpers.push(goalie2);
    }

    gameEngine.init(ctx);
    gameEngine.start();
    ctx.canvas.focus();
});
