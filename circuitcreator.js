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
var isMouseDown = false;
var calc;

/**********************************************************
 * Javascript's "bucket of stupid"
 *********************************************************/
function isString(s)
{
  return typeof(s) === 'string' || s instanceof String;
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
    this.imgDim = 10;  // Image will be scaled to this dimension in both directions.
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
    // TODO: Resize image to imgDim size.
  }

  getBounds()
  {
    return { x0 : this.x,
             x1 : this.x + this.imgDim,
             y0 : this.y,
             y1 : this.y + this.imgDim,
           };
  }
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
    this.symbolImg = new Image();
    this.x = 0;
    this.y = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.width = 0;
    this.height = 0;
    this.isHeld = false;
    this.handleImageLoad = function () {
      calc.width = calc.baseImg.naturalWidth;
      calc.height = calc.baseImg.naturalHeight;

      drawImageOnCanvas(this.baseImg, this.x, this.y);
    }
    this.pins = {
      input : [],
      output : [],
    }
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
        pin.x = this.x + pin.imgDim;
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
    drawImageOnCanvas(this.baseImg, this.x, this.y);
    // Draw symbol image
    // TODO: Draw symbol overlay
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
      drawImageOnCanvas(pin.img, pin.x, pin.y);
    }
  }
}

/**********************************************************
 * Image Functions
 *********************************************************/
function drawImageOnCanvas(imgHandle, x, y)
{
  context.drawImage(imgHandle, x, y);
}

/**********************************************************
 * Button Handlers
 *********************************************************/
function exportClickHandler()
{
  if (gadgets.length > 0)
  {
    gadgets[0].addPin("in");
  }
}

function newClickHandler()
{
  if (gadgets.length > 0)
  {
    gadgets[0].addPin("out");
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
  x = e.offsetX;
  y = e.offsetY;

  for (let gadget of gadgets)
  {
    //console.log("Gadget Dimensions: width = " + gadget.width + "; height = " + gadget.height);
    if (x > gadget.x &&
        x < gadget.x + gadget.width &&
        y > gadget.y &&
        y < gadget.y + gadget.height)
    {
      //console.log("Detected a click on a gadget.");
      gadget.isHeld = true;

      gadget.offsetX = x - gadget.x;
      gadget.offsetY = y - gadget.y;
    }
  }

  isMouseDown = true;
}

function canvasMouseMove(e)
{
  if (isMouseDown)
  {
    x = e.offsetX;
    y = e.offsetY;

    for (let gadget of gadgets)
    {
      if (gadget.isHeld)
      {
        gadget.x = x - gadget.offsetX;
        gadget.y = y - gadget.offsetY;

        // Left bounds
        if (gadget.x < 0)
        {
          gadget.x = 0;
        }
        // Right bounds
        if (gadget.x + gadget.width > canvas.width())
        {
          gadget.x = canvas.width() - gadget.width;
        }
        // Top Bounds
        if (gadget.y < 0)
        {
          gadget.y = 0;
        }
        // Bottom bounds
        if (gadget.y + gadget.height > canvas.height())
        {
          gadget.y = canvas.height() - gadget.height;
        }
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
}

/**********************************************************
 * Initialization
 *********************************************************/
function init()
{
  var canvasMarginTop = parseInt(canvas.css("margin-top"), 10);
  canvas.attr({
    width: window.innerWidth,
    height: window.innerHeight - canvasMarginTop,
  });

  calc = new Gadget("calculator", "MyCalculator");
  calc.baseImg.onload = $.proxy(calc.handleImageLoad, calc);
  calc.baseImg.src = "assets/icons/gadget_base.png";

  canvas.mousedown(canvasClickBegin);
  canvas.mousemove(canvasMouseMove);
  canvas.mouseup(canvasClickEnd);

  gadgets.push(calc);
}

$(init);