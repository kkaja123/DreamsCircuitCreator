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
    }
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
}

/**********************************************************
 * Wire class definition
 *********************************************************/
class Wire
{
  constructor(inX, inY, outX, outY)
  {
    this.input = {x: inX, y: inY};
    this.output = {x: outX, y: outY};

    // Declare fields
    this.lineCap = "round";
    this.color = "#00b33c";
    this.lineWidth = 4;
    this.bezierControlPointStrength = 50;
  }

  drawWire()
  {
    context.lineCap = this.lineCap;
    context.strokeStyle = this.color;
    context.lineWidth = this.lineWidth;

    context.beginPath();
    context.moveTo(this.input.x, this.input.y);
    var bezierControlPointAmount = Math.sqrt(Math.pow(this.output.x - this.input.x, 2) + Math.pow(this.output.y - this.input.y, 2)) / 100 * this.bezierControlPointStrength;
    context.bezierCurveTo(this.input.x + bezierControlPointAmount,
                          this.input.y,
                          this.output.x - bezierControlPointAmount,
                          this.output.y,
                          this.output.x,
                          this.output.y);
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

  // DEV MODE
  var wire1 = new Wire(300, 300, 1000, 200);
  wires.push(wire1);
  refreshCanvas();
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

  for (let gadget of gadgets)
  {
    if (!isItemHeld &&
        inputPos.x > gadget.x &&
        inputPos.x < gadget.x + gadget.width &&
        inputPos.y > gadget.y &&
        inputPos.y < gadget.y + gadget.height)
    {
      gadget.isHeld = true;
      isItemHeld = true;
      gadget.offsetX = inputPos.x - gadget.x;
      gadget.offsetY = inputPos.y - gadget.y;

      break;  // Only grab one gadget
    }
    else if (!isItemHeld)  // TODO: check for pin hit on click. Create new wire.
    {

    }
  }
  // DEV MODE
  if (wires.length > 0)
  {
    wires[0].output.x = inputPos.x;
    wires[0].output.y = inputPos.y;
    refreshCanvas();
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
  if (isMouseDown)
  {
    var inputPos = getInputPositionRelativeToCanvas(e);

    for (let gadget of gadgets)
    {
      if (gadget.isHeld)
      {
        gadget.x = inputPos.x - gadget.offsetX;
        gadget.y = inputPos.y - gadget.offsetY;

        gadget.doBoundsCheck(canvas.width(), canvas.height());
      }
    }

    refreshCanvas();
  }
}

function canvasClickEnd(e)
{
  for (let gadget of gadgets)
  {
    if (gadget.isHeld)
    {
      gadget.isHeld = false;
    }
  }

  isMouseDown = false;
  isItemHeld = false;
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