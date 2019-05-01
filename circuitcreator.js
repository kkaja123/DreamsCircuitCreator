/* Dreams Circuit Creator
 *
 * Created by Kyle Kaja (ArcticNinja73; PSN: TheHiddenSpectre)
 *
 * View source at https://github.com/kkaja123/DreamsCircuitCreator
 */

const canvas = $("#graphics");
const canvasContainer = $(".canvas-container");
const menuBar = $(".top-bar");
const context = canvas[0].getContext("2d");
var gadgets = [];
var wires = [];
var isMouseDown = false;
var isItemHeld = false;  // Used to make sure to only grab a single item
var calc;

/**********************************************************
 * Javascript's "bucket of stupid"
 *********************************************************/
function isString(s)
{
  return typeof(s) === 'string' || s instanceof String;
}

/**********************************************************
 * Gadget class definition
 *********************************************************/
class Gadget
{  constructor(gadgetType, displayName)
  {
    if (isString(displayName))
    {
      this.displayName = displayName;
    }
    else
    {
      throw "Gadget's display name is not a String type: " + typeof displayName;
    }

    // Get gadget's symbol image
    if (isString(gadgetType))
    {
      console.log("Gadget type (i.e. symbol) is not yet implemented");
    }
    else
    {
      throw "Gadget's type is not a String type: " + typeof gadgetType;
    }

    // Declare fields
    this.baseImg = new Image();
    this.baseImg.onload = $.proxy(this.handleImageLoad, this);
    this.symbolImg = new Image();
    this.symbolImg.onload = $.proxy(this.handleImageLoad, this);
    this.x = 0;
    this.y = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.width = 80;
    this.height = 80;
    this.isHeld = false;
    this.pins = {
      input : [],
      output : [],
    };
  }

  handleImageLoad()
  {
    refreshCanvas();
  }

  getPinArray(pinType)
  {
    var type = pinType.toLowerCase();
    if (type != "in" && type != "out")
    {
      throw "Unable to get pin array; pinType is invalid.";
    }

    return type === "in" ? this.pins.input : this.pins.output;
  }

  addPin(pinType)
  {
    var pinArray = this.getPinArray(pinType);

    pinArray.push(new Pin(pinType, false));
    this.repositionPins();

    refreshCanvas();
  }

  removePin(pinType)
  {
    var pinArray = this.getPinArray(pinType);
    if (pinArray.length > 0)
    {
      pinArray.pop();
      this.repositionPins();

      refreshCanvas();
    }
    else
    {
      console.log("No pins to remove of type " + pinType);
    }
  }

  repositionPins()
  {
    this.repositionPinsByType("in");
    this.repositionPinsByType("out");
  }

  // TODO: Pin repositioning is bugged.
  repositionPinsByType(pinType)
  {
    var pinArray = this.getPinArray(pinType);
    var pinInterval = this.height / (pinArray.length + 1);
    var pinIndex = 0;

    for (let pin of pinArray)
    {
      ++pinIndex;

      if (pinType === "in")
      {
        pin.x = this.x - pin.imgDim;
      }
      else if (pinType === "out")
      {
        pin.x = this.x + this.width;
      }
      else
      {
        throw "While repositioning gadget pins, unexpected pinType: " + pinType;
      }

      pin.y = this.y + (pinIndex * pinInterval) - (pin.imgDim / 2);
    }
  }

  drawGadgetOnCanvas()
  {
    // Draw base image
    drawImageOnCanvas(this.baseImg, this.x, this.y, this.width, this.height);
    // Draw symbol image
    // TODO: Draw symbol overlay
    this.repositionPins();
    this.drawPinsOnCanvas();
  }

  drawPinsOnCanvas()
  {
    this.drawPinsOnCanvasByType("in");
    this.drawPinsOnCanvasByType("out");
  }

  drawPinsOnCanvasByType(pinType)
  {
    var pinArray = this.getPinArray(pinType.toLowerCase());

    for (let pin of pinArray)
    {
      pin.drawPinOnCanvas();
    }
  }

  doBoundsCheck(width, height)
  {
    // Left bounds
    var leftModifier = 0;
    if (this.pins.input.length > 0)
    {
      leftModifier = this.pins.input[0].imgDim;
    }
    if (this.x - leftModifier < 0)
    {
      this.x = 0 + leftModifier;
    }
    // Right bounds
    var rightModifier = 0;
    if (this.pins.output.length > 0)
    {
      rightModifier = this.pins.output[0].imgDim;
    }
    if (this.x + this.width + rightModifier > width)
    {
      this.x = width - this.width - rightModifier;
    }
    // Top Bounds
    if (this.y < 0)
    {
      this.y = 0;
    }
    // Bottom bounds
    if (this.y + this.height > height)
    {
      this.y = height - this.height;
    }
  }

  checkForBaseCollision(x, y)
  {
    var hitResult = {isHit: false};

    if (x > this.x &&
        x < this.x + this.width &&
        y > this.y &&
        y < this.y + this.height)
    {
      hitResult.isHit = true;
    }

    return hitResult;
  }

  checkForPinCollision(x, y)
  {
    var hitResult = {isHit: false, hitPin: null};
    var pinResult = false;

    // Check input pin list for collision
    for (let pin of this.pins.input)
    {
      pinResult = pin.checkForCollision(x, y);
      if (pinResult)
      {
        hitResult.isHit = true;
        hitResult.hitPin = pin;
        break;
      }
    }

    // Check output pin list for collision
    if (!hitResult.isHit)
    {
      for (let pin of this.pins.output)
      {
        pinResult = pin.checkForCollision(x, y);
        if (pinResult)
        {
          hitResult.isHit = true;
          hitResult.hitPin = pin;
          break;
        }
      }
    }

    return hitResult;
  }
}

/**********************************************************
 * Pin class definition
 *********************************************************/
class Pin
{
  constructor(pinType, isEmpty)
  {
    var type = pinType.toLowerCase();

    if (type != "in" && type != "out")
    {
      throw "Pin type " + type + "is not a valid pin type. Use 'in' or 'out'.";
    }

    this.pinType = type;
    this.imgDim = 15;  // Image will be scaled to this dimension in both directions.
    this.img = new Image();
    this.img.onload = $.proxy(this.handleImageLoad, this);
    if (!isEmpty && type === "in")
    {
      this.img.src = "assets/icons/input_pin.png";
    }
    else if (!isEmpty && type === "out")
    {
      this.img.src = "assets/icons/output_pin.png";
    }

    // Declare fields
    this.x = 0;
    this.y = 0;
    this.connectedTo;  // Object that this Pin is connected to. Usually another Pin or an EmptyPoint.
    this.isEmpty = isEmpty;  // Set to true if this Pin is not attached to a gadget.
    this.extraCollision = 4;  // Number of extra pixels to allow a hit to collide with this pin.
  }

  handleImageLoad()
  {
    refreshCanvas();
  }

  getBounds()
  {
    return { x0 : this.x,
             x1 : this.x + this.imgDim,
             y0 : this.y,
             y1 : this.y + this.imgDim,
           };
  }

  drawPinOnCanvas()
  {
    drawImageOnCanvas(this.img, this.x, this.y, this.imgDim, this.imgDim);
  }

  checkForCollision(x, y)
  {
    var hitResult = false;
    var pinBounds = this.getBounds();

    // Add on extra collision hitbox
    pinBounds.x0 -= this.extraCollision;
    pinBounds.x1 += this.extraCollision;
    pinBounds.y0 -= this.extraCollision;
    pinBounds.y1 += this.extraCollision;

    // Check collision on hitbox
    if (x >= pinBounds.x0 &&
        x <= pinBounds.x1 &&
        y >= pinBounds.y0 &&
        y <= pinBounds.y1)
    {
      hitResult = true;
    }

    return hitResult;
  }
}

/**********************************************************
 * Wire class definition
 *********************************************************/
class Wire
{
  constructor(inPin, outPin)
  {
    // Declare fields
    this.lineCap = "round";
    this.color = "#00b33c";
    this.lineWidth = 4;
    this.bezierControlPointStrength = 50;
    this.inPin = inPin;
    this.outPin = outPin;
    this.holdSource = "none";  // Dictates what type of pin is the source of the wire when held.
    this.inPos = {
      x: this.inPin.x + (this.inPin.imgDim / 2),
      y: this.inPin.y + (this.inPin.imgDim / 2),
    };
    this.outPos = {
      x: this.outPin.x + (this.outPin.imgDim / 2),
      y: this.outPin.y + (this.outPin.imgDim / 2),
    };
  }

  drawWire()
  {
    // Update endpoint positions
    this.inPos = {
      x: this.inPin.x + (this.inPin.imgDim / 2),
      y: this.inPin.y + (this.inPin.imgDim / 2),
    };
    this.outPos = {
      x: this.outPin.x + (this.outPin.imgDim / 2),
      y: this.outPin.y + (this.outPin.imgDim / 2),
    };

    // Draw path background
    // Apply context attributes
    context.lineCap = this.lineCap;
    context.strokeStyle = "black";
    context.lineWidth = this.lineWidth + 2;

    // Draw Bezier path
    context.beginPath();
    context.moveTo(this.outPos.x, this.outPos.y);
    var bezierControlPointAmount = (Math.sqrt(
      Math.pow(this.inPos.x - this.outPos.x, 2)
      + Math.pow(this.inPos.y - this.outPos.y, 2))
      / 100 * this.bezierControlPointStrength);
    context.bezierCurveTo(this.outPos.x + bezierControlPointAmount,
                          this.outPos.y,
                          this.inPos.x - bezierControlPointAmount,
                          this.inPos.y,
                          this.inPos.x,
                          this.inPos.y);
    context.stroke();

    // Draw path foreground
    // Apply context attributes
    context.lineCap = this.lineCap;
    context.strokeStyle = this.color;
    context.lineWidth = this.lineWidth;

    // Draw Bezier path
    context.beginPath();
    context.moveTo(this.outPos.x, this.outPos.y);
    var bezierControlPointAmount = (Math.sqrt(
      Math.pow(this.inPos.x - this.outPos.x, 2)
      + Math.pow(this.inPos.y - this.outPos.y, 2))
      / 100 * this.bezierControlPointStrength);
    context.bezierCurveTo(this.outPos.x + bezierControlPointAmount,
                          this.outPos.y,
                          this.inPos.x - bezierControlPointAmount,
                          this.inPos.y,
                          this.inPos.x,
                          this.inPos.y);
    context.stroke();
  }
}

/**********************************************************
 * Image Functions
 *********************************************************/
function drawImageOnCanvas(imgHandle, x, y, width, height)
{
  context.imageSmoothingEnabled = false;
  context.drawImage(imgHandle, x, y, width, height);
}

/**********************************************************
 * Button Handlers
 *********************************************************/
function exportClickHandler()
{
  // DEV MODE
  for (let gadget of gadgets)
  {
    gadget.addPin("in");  // DEV ONLY to add input pins
  }
}

function newClickHandler()
{
  // DEV MODE
  for (let gadget of gadgets)
  {
    gadget.addPin("out");  // DEV ONLY to add output pins
  }
}

var displayPalette = false;
function paletteClickHandler()
{
  displayPalette = !displayPalette;

  if (displayPalette)
  {
    $(".palette-menu").css("display", "");
  }
  else
  {
    $(".palette-menu").css("display", "none");
  }
}

/**********************************************************
 * Canvas Functions
 *********************************************************/
function refreshCanvas()
{
  context.clearRect(0, 0, canvas.width(), canvas.height());

  // Draw wires first so that the pin images are displayed on top of the wires
  for (let wire of wires)
  {
    wire.drawWire();
  }
  for (let gadget of gadgets)
  {
    gadget.drawGadgetOnCanvas();
  }
}

/**********************************************************
 * Canvas Handlers
 *********************************************************/
function canvasClickBegin(e)
{
  var inputPos = getInputPositionRelativeToCanvas(e);

  if (!isItemHeld)
  {
    for (let gadget of gadgets)
    {
      var hitResult = gadget.checkForBaseCollision(inputPos.x, inputPos.y);
      if (hitResult.isHit)
      {
        gadget.isHeld = true;
        gadget.offsetX = inputPos.x - gadget.x;
        gadget.offsetY = inputPos.y - gadget.y;
        isItemHeld = true;

        break;  // Only grab a single gadget
      }
      else
      {
        hitResult = gadget.checkForPinCollision(inputPos.x, inputPos.y);
        if (hitResult.isHit)
        {
          var inPin = null;
          var outPin = null;
          var pinType = hitResult.hitPin.pinType;

          if (pinType === "in")
          {
            inPin = hitResult.hitPin;
            outPin = new Pin("out", true);
            outPin.x = inputPos.x;
            outPin.y = inputPos.y;
            outPin.imgDim = 0;
          }
          else if (pinType === "out")
          {
            outPin = hitResult.hitPin;
            inPin = new Pin("in", true);
            inPin.x = inputPos.x;
            inPin.y = inputPos.y;
            inPin.imgDim = 0;
          }

          var pinWire = new Wire(inPin, outPin);
          pinWire.holdSource = pinType;
          wires.push(pinWire);
          isItemHeld = true;
          refreshCanvas();

          break;  // Only grab a single wire
        }
      }
    }
  }
  else
  {
    for (let wire of wires)
    {
      if (wire.holdSource === "in" || wire.holdSource === "out")
      {
        // Search for a pin collision
        for (let gadget of gadgets)
        {
          var hitResult = gadget.checkForPinCollision(inputPos.x, inputPos.y);

          if (hitResult.isHit)
          {
            if (wire.holdSource === "in" && hitResult.hitPin.pinType === "out")
            {
              wire.outPin = hitResult.hitPin;
              isItemHeld = false;
              wire.holdSource = "none";
              refreshCanvas();
              break;  // Attach wire to only one gadget pin
            }
            else if (wire.holdSource === "out" && hitResult.hitPin.pinType === "in")
            {
              wire.inPin = hitResult.hitPin;
              isItemHeld = false;
              wire.holdSource = "none";
              refreshCanvas();
              break;  // Attach wire to only one gadget pin
            }
            else
            {
              alert("Cannot attach wire from pin type " + wire.holdSource +
                " to pin type " + hitResult.hitPin.pinType + ".");
            }
          }
        }
      }
    }
  }

  isMouseDown = true;
}

function canvasMouseMove(e)
{
  if ("buttons" in e)
  {
    const MOUSE_BUTTON_LEFT = 1;
    if ((e.buttons & MOUSE_BUTTON_LEFT) == 0)  // Check to see if the left mouse button is not pressed
    {
      canvasClickEnd(e);
    }
  }

  if (isItemHeld)
  {
    var inputPos = getInputPositionRelativeToCanvas(e);

    // Handle dragging the gadget base
    if (isMouseDown)
    {
      for (let gadget of gadgets)
      {
        if (gadget.isHeld)
        {
          gadget.x = inputPos.x - gadget.offsetX;
          gadget.y = inputPos.y - gadget.offsetY;

          gadget.doBoundsCheck(canvas.width(), canvas.height());
        }
      }
    }

    // Handle click and moving wire end
    for (let wire of wires)
    {
      if (wire.holdSource === "in")
      {
        wire.outPin.x = inputPos.x;
        wire.outPin.y = inputPos.y;
      }
      else if (wire.holdSource === "out")
      {
        wire.inPin.x = inputPos.x;
        wire.inPin.y = inputPos.y;
      }
    }

    refreshCanvas();
  }
}

function canvasClickEnd(e)
{
  if (isItemHeld)
  {
    for (let gadget of gadgets)
    {
      if (gadget.isHeld)
      {
        gadget.isHeld = false;
        isItemHeld = false;
        refreshCanvas();
      }
    }
  }

  isMouseDown = false;
}

function getInputPositionRelativeToCanvas(e)
{
  // Get mouse position relative to canvas
  var canvasOffset = canvas.offset();
  x = e.pageX - canvasOffset.left;
  y = e.pageY - canvasOffset.top;

  return {x, y};
}

/**********************************************************
 * Initialization
 *********************************************************/
function init()
{
  // Initialize canvas attributes
  var canvasMarginTop = parseInt(canvas.css("margin-top"), 10);
  canvas.attr({
    width: window.innerWidth,
    height: window.innerHeight - canvasMarginTop,
  });

  // Gadget creation (TEMPORARY DEV MODE!!)
  calc = new Gadget("calculator", "MyCalculator");
  calc.baseImg.src = "assets/icons/gadget_base.svg";

  var timer = new Gadget("timer", "DelayTimer");
  timer.baseImg.src = "assets/icons/gadget_base.svg";
  timer.x = 200;
  timer.y = 200;

  // Assign input handlers
  canvas.mousedown(canvasClickBegin);
  $(document).mousemove(canvasMouseMove);
  canvas.mouseup(canvasClickEnd);

  // Add gadget objects
  gadgets.push(calc);
  gadgets.push(timer);
}

$(init);