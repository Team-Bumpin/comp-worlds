// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

car1_img_path = "./img/mini_cooper1.png"; // 142 x 73 pixels
car2_img_path = "./img/mini_cooper2.png"; // 146 x 67 pixels
puck_img_path = "./img/bagel_puck.png"; // 46 x 47 pixels
// averaged offset for cars
car_img_x_offset = 72;
car_img_y_offset = 35;
puck_img_offset = 23;
canvas_width = 1233;
canvas_height = 710;
player1_start_x = 320;
player1_start_y = canvas_height / 2;
player2_start_x = canvas_width - 320;
player2_start_y = canvas_height / 2;
accel_key = 87;  // 'W' key
backup_key = 83; // 'S' key
left_key = 65;   // 'A' key
right_key = 68;  // 'D' key
COLLISION_COOLDOWN = 5;

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
    //console.log(path.toString());
    return this.cache[path];
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
    this.pressedKeys = [0, 0, 0, 0]; // [accel_key, backup_key, left_key, right_key]
}

GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();
    console.log('game initialized');
};

GameEngine.prototype.start = function () {
    console.log("starting game");
    var that = this;
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
		/*
        if (x < 1024) {
            x = Math.floor(x / 32);
            y = Math.floor(y / 32);
        }
        */
        return { x: x, y: y };
    };

    var that = this;
    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
        //console.log("click[x=" + that.click.x + ",y=" + that.click.y + "]");
    }, false);
    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
        //console.log("mouse[x=" + that.mouse.x + ",y=" + that.mouse.y + "]");
    }, false);
    /*this.ctx.canvas.addEventListener("mousewheel", function (e) {
        that.wheel = e;
    }, false);*/
    
    this.ctx.canvas.addEventListener("keydown", function (e) {
    	// that.keydown = e;
    	// e.preventDefault();
    	switch (e.which) {
        	case accel_key:
	        	e.preventDefault();
	        	that.pressedKeys[0] = accel_key;
	        	//console.log(that.pressedKeys.toString());
	        	break;
	        case backup_key:
	        	e.preventDefault();
	        	that.pressedKeys[1] = backup_key;
	        	//console.log(that.pressedKeys.toString());
	        	break;
	        case left_key:
	        	e.preventDefault();
	        	that.pressedKeys[2] = left_key;
	        	//console.log(that.pressedKeys.toString());
	        	break;
	        case right_key:
	        	e.preventDefault();
	        	that.pressedKeys[3] = right_key;
	        	//console.log(that.pressedKeys.toString());
	        	break;
        	default:
        		//do nothing
        }
    }, false);
    
    this.ctx.canvas.addEventListener("keyup", function (e) {
    	// that.keydown = e;
    	// e.preventDefault();
    	switch (e.which) {
        	case accel_key:
	        	e.preventDefault();
	        	that.pressedKeys[0] = 0;
	        	//console.log(that.pressedKeys.toString());
	        	break;
	        case backup_key:
	        	e.preventDefault();
	        	that.pressedKeys[1] = 0;
	        	//console.log(that.pressedKeys.toString());
	        	break;
	        case left_key:
	        	e.preventDefault();
	        	that.pressedKeys[2] = 0;
	        	//console.log(that.pressedKeys.toString());
	        	break;
	        case right_key:
	        	e.preventDefault();
	        	that.pressedKeys[3] = 0;
	        	//console.log(that.pressedKeys.toString());
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
    this.update();
    this.draw();
    this.click = null;
    // this.wheel = null;
    this.keydown = null;
};

function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function () {
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
	this.rotation = 90;
	this.rotationStep = 4;
	this.maxSpeed = 8;
	this.backSpeed = 5;
    this.radius = 40;
    this.mass = 1;
    Entity.call(this, game, x, y);
}

Car.prototype = new Entity();

Car.prototype.constructor = Car;

Car.prototype.update = function () {
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

    for (var i = 0; i < this.game.pressedKeys.length; i++) {
        switch (this.game.pressedKeys[i]) {
            case accel_key:
                speed += this.acceleration;
                this.velX += this.acceleration * Math.sin(this.rotation * (Math.PI/180));
                this.velY += this.acceleration * Math.cos(this.rotation * (Math.PI/180)) * -1;
                break;
            case backup_key:
                speed -= this.backSpeed;
                this.velX -= this.acceleration * Math.sin(this.rotation * (Math.PI/180));
                this.velY -= this.acceleration * Math.cos(this.rotation * (Math.PI/180)) * -1;
                break;
            case left_key:
                if (speed > 0.3) {
                    this.rotation -= this.rotationStep * (speed / this.maxSpeed);
                }
                break;
            case right_key:
                if (speed > 0.3) {
                    this.rotation += this.rotationStep * (speed / this.maxSpeed);
                }
                break;
            default:
            // do nothing
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

function Puck(game, x, y) {
    Entity.call(this, game, x, y);
    this.img_offset = 23;
    this.velX = -0.8;
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
                console.log(i + ": distance: " + calcDistance(this, car));
                this.doCollision(car);
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
    }
}

Puck.prototype.draw = function (ctx) {
    ctx.drawImage(ASSET_MANAGER.getAsset(puck_img_path), this.x - this.img_offset, this.y - this.img_offset);
    var color = "green";
    if (this.collided > 0) {
        color = "red";
        this.collided--;
    }
    drawCircle(this.x, this.y, this.radius, color);
};

// the "main" code begins here
var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload(car1_img_path);
// ASSET_MANAGER.queueDownload(car2_img_path);
ASSET_MANAGER.queueDownload(puck_img_path);

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');
    
    canvas.tabIndex = 1;
    var gameEngine = new GameEngine();
    // var gameboard = new GameBoard();
    var puck = new Puck(gameEngine, canvas_width / 2, canvas_height / 2);
    var player1 = new Car(gameEngine, player1_start_x, player1_start_y, 1, car1_img_path);
    // var player2 = new Car(gameEngine, player2_start_x, player2_start_y, 2, car2_img_path);
	gameEngine.addEntity(puck);
    gameEngine.addEntity(player1);
    // gameEngine.addEntity(player2);
    gameEngine.cars[0] = player1;
 
    gameEngine.init(ctx);
    gameEngine.start();
    ctx.canvas.focus();
});
