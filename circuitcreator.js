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
var emptyPins = [];
var isMouseDown = false;
var isItemHeld = false;  // Used to make sure to only grab a single item
var isMousePanning = false;  // Using the mouse button to pan the canvas
var panPosition = {
  x: 0,
  y: 0,
};
var panSensitivity = 1;
var zoomScale = 1;
var zoomSensitivity = 0.05;
var origin;

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
{
  constructor(gadgetType, displayName)
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

    }
    else
    {
      throw "Gadget's type is not a String type: " + typeof gadgetType;
    }

    // Declare fields
    this.middleImg = new Image();
    this.middleImg.onload = $.proxy(this.handleImageLoad, this);
    this.middleImg.src = "assets/icons/gadget_middle.png";
    this.topImg = new Image();
    this.topImg.onload = $.proxy(this.handleImageLoad, this);
    this.topImg.src = "assets/icons/gadget_top.png";
    this.bottomImg = new Image();
    this.bottomImg.onload = $.proxy(this.handleImageLoad, this);
    this.bottomImg.src = "assets/icons/gadget_bottom.png";
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
    // The scale of the size for the top and bottom bits compared to the width
    // I.e. 25.0 mm height x 100.0 mm width = 0.25
    this.endBitsScale = 0.25;
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
    this.recalculateHeightByPinCount();
    this.repositionPinsByType("in");
    this.repositionPinsByType("out");
  }

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

  recalculateHeightByPinCount()
  {
    var inputPinHeight = 0;
    var outputPinHeight = 0;
    var maxPinHeight = 0;
    var endBitsHeight = this.width * this.endBitsScale;
    var minimumMiddleHeight = this.width - 2 * endBitsHeight;

    for (let pin of this.pins.input)
    {
      inputPinHeight += pin.imgDim + pin.extraCollision;  // Normally, we'd use 2 * extra collision to encap. full collision box, but it's a bit overbearing.
    }

    for (let pin of this.pins.output)
    {
      outputPinHeight += pin.imgDim + pin.extraCollision;
    }

    maxPinHeight = inputPinHeight > outputPinHeight ? inputPinHeight : outputPinHeight;
    if (maxPinHeight > minimumMiddleHeight)
    {
      this.height = endBitsHeight * 2 + maxPinHeight;
    }
    else
    {
      this.height = endBitsHeight * 2 + minimumMiddleHeight;
    }
  }

  drawGadgetOnCanvas()
  {
    var endBitsHeight = this.width * this.endBitsScale;

    // Prep gadget
    this.repositionPins();

    // Draw top of base image
    drawImageOnCanvas(this.topImg, this.x, this.y, this.width, endBitsHeight);
    // Draw middle of base image
    drawImageOnCanvas(this.middleImg, this.x, this.y + endBitsHeight, this.width, this.height - 2 * endBitsHeight);
    // Draw bottom of base image
    drawImageOnCanvas(this.bottomImg, this.x, this.y + this.height - endBitsHeight, this.width, endBitsHeight);

    // Draw symbol image
    drawImageOnCanvas(this.symbolImg, this.x, this.y + this.height / 2 - this.width / 2, this.width, this.width);  // Force symbol into square scale. This means original image should have a square ratio!

    // Draw pins
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

  // width and height are screen space dimensions (not canvas space)
  doBoundsCheck(width, height)
  {
    var screen = getScreenPointFromCanvasPoint(this.x, this.y);

    // Left bounds
    var leftModifier = 0;
    if (this.pins.input.length > 0)
    {
      leftModifier = this.pins.input[0].imgDim;
    }
    if (screen.x - leftModifier < 0)
    {
      this.x = 0 + leftModifier + panPosition.x;
    }
    // Right bounds
    var rightModifier = 0;
    if (this.pins.output.length > 0)
    {
      rightModifier = this.pins.output[0].imgDim;
    }
    if (screen.x + (this.width + rightModifier) * zoomScale > width)
    {
      this.x = width / zoomScale - this.width - rightModifier + panPosition.x;
    }
    // Top Bounds
    if (screen.y < 0)
    {
      this.y = 0 + panPosition.y;
    }
    // Bottom bounds
    if (screen.y + this.height * zoomScale > height)
    {
      this.y = height / zoomScale - this.height + panPosition.y;
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
    else if (isEmpty)
    {
      this.img.src = "assets/icons/empty_pin.png";
    }

    // Declare fields
    this.x = 0;
    this.y = 0;
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
    drawCubicBezierOnCanvas(this.outPos,
                            this.inPos,
                            this.bezierControlPointStrength,
                            this.lineCap,
                            this.lineWidth + 2,
                            "black");

    // Draw path foreground
    drawCubicBezierOnCanvas(this.outPos,
                            this.inPos,
                            this.bezierControlPointStrength,
                            this.lineCap,
                            this.lineWidth,
                            this.color);
  }
}

/**********************************************************
 * DEV MODE Origin class
 *********************************************************/
class Origin
{
  constructor(radius)
  {
    this.x = 0;
    this.y = 0;
    this.radius = radius;
  }

  draw()
  {
    let screenPos = getScreenPointFromCanvasPoint(this.x, this.y);
    context.beginPath();
    context.arc(screenPos.x, screenPos.y, this.radius, 0, 2 * Math.PI, false);
    context.fill();
  }
}

/**********************************************************
 * Draw Functions
 *********************************************************/
function drawImageOnCanvas(imgHandle, x, y, width, height)
{
  let screen = getScreenPointFromCanvasPoint(x, y);
  context.drawImage(imgHandle,
                    screen.x,
                    screen.y,
                    width * ((zoomScale + 0.04) - (zoomScale % 0.01)),
                    height * ((zoomScale + 0.04) - (zoomScale % 0.01)));
}

// Bezier control points are automatically placed in the x axis from start/end points.
function drawCubicBezierOnCanvas(start,
                                 end,
                                 controlPointStrength,
                                 lineCap,
                                 lineWidth,
                                 strokeStyle)
{
  let screenStart = getScreenPointFromCanvasPoint(start.x, start.y);
  let screenEnd = getScreenPointFromCanvasPoint(end.x, end.y);

  // Apply context attributes
  context.lineCap = lineCap;
  context.lineWidth = lineWidth * zoomScale;
  context.strokeStyle = strokeStyle;

  // Draw Bezier path
  context.beginPath();
  context.moveTo(screenStart.x, screenStart.y);
  var bezierControlPointAmount = (Math.sqrt(
    Math.pow(screenEnd.x - screenStart.x, 2)
    + Math.pow(screenEnd.y - screenStart.y, 2))
    / 100 * controlPointStrength);
  context.bezierCurveTo(screenStart.x + bezierControlPointAmount,
                        screenStart.y,
                        screenEnd.x - bezierControlPointAmount,
                        screenEnd.y,
                        screenEnd.x,
                        screenEnd.y);
  context.stroke();
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

  for (let pin of emptyPins)
  {
    pin.drawPinOnCanvas();
  }

  for (let gadget of gadgets)
  {
    gadget.drawGadgetOnCanvas();
  }

  origin.draw();
}

// Uses the canvas's element offset within the document to produce a screen space
// coordinate from a document space coordinate. This is not considered canvas space!
function getScreenPositionRelativeToCanvasElement(inX, inY)
{
  // Get mouse position relative to canvas
  var canvasOffset = canvas.offset();
  var x = (inX - canvasOffset.left);
  var y = (inY - canvasOffset.top);

  return {x, y};
}

// "Canvas" means the coordinate system that the gadgets and pins use.
// "Screen" means the coordinate system that the display uses (canvas's draw methods).
// Mouse position comes from the "Screen" coordinate system (mouse position relative to canvas element's offset).
function getScreenPointFromCanvasPoint(x, y)
{
  return {
    x: (x - panPosition.x) * zoomScale,
    y: (y - panPosition.y) * zoomScale
  };
}

function getCanvasPointFromScreenPoint(x, y)
{
  return {
    x: x / zoomScale + panPosition.x,
    y: y / zoomScale + panPosition.y
  };
}

/**********************************************************
 * Canvas Handlers
 *********************************************************/
function canvasClickBegin(e)
{
  if ("buttons" in e)
  {
    const MOUSE_BUTTON_LEFT = 1;
    const MOUSE_BUTTON_RIGHT = 2;
    const MOUSE_BUTTON_MIDDLE = 4;

    if ((e.buttons & MOUSE_BUTTON_LEFT) != 0)
    {
      handleCanvasLeftClickBegin(e);
    }
    if ((e.buttons & MOUSE_BUTTON_RIGHT) != 0)
    {
      handleCanvasRightClickBegin(e);
    }
    if ((e.buttons & MOUSE_BUTTON_MIDDLE) != 0)
    {
      handleCanvasMiddleClickBegin(e);
    }
  }
}

function handleCanvasLeftClickBegin(e)
{
  var screen = getScreenPositionRelativeToCanvasElement(e.pageX, e.pageY);
  var inputPos = getCanvasPointFromScreenPoint(screen.x, screen.y);

  if (!isItemHeld)
  {
    // Check for gadget related collisions
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

    // Check for empty pin collisions
    for (let pin of emptyPins)
    {
      var hitResult = pin.checkForCollision(inputPos.x, inputPos.y);

      if (hitResult)
      {
        // When clicking on an empty, we don't know what direction the wire
        // should face. For now, set the empty as the out pin and the handle as
        // the in pin. Once the wire finds a home, update both pins based on
        // the new pin information.
        var inPin = new Pin("in", true);
        inPin.x = inputPos.x;
        inPin.y = inputPos.y;
        var outPin = new Pin("out", true);
        outPin.x = pin.x;
        outPin.y = pin.y;

        var pinWire = new Wire(inPin, outPin);
        pinWire.holdSource = "empty";
        wires.push(pinWire);
        isItemHeld = true;
        refreshCanvas();

        break;  // Only grab a single wire
      }
    }
  }
  else  // if (!isItemHeld)
  {
    // Check for home of held wire at click location
    for (let wire of wires)
    {
      if (wire.holdSource === "in"  ||
          wire.holdSource === "out" ||
          wire.holdSource === "empty")
      {
        // Search for a gadget pin collision
        for (let gadget of gadgets)
        {
          var hitResult = gadget.checkForPinCollision(inputPos.x, inputPos.y);

          if (hitResult.isHit)
          {
            if (wire.holdSource === "in" && hitResult.hitPin.pinType === "out")
            {
              wire.outPin = hitResult.hitPin;
              wire.holdSource = "none";
              isItemHeld = false;
              refreshCanvas();
              break;  // Attach wire to only one gadget pin
            }
            else if (wire.holdSource === "out" && hitResult.hitPin.pinType === "in")
            {
              wire.inPin = hitResult.hitPin;
              wire.holdSource = "none";
              isItemHeld = false;
              refreshCanvas();
              break;  // Attach wire to only one gadget pin
            }
            else if (wire.holdSource === "empty")
            {
              // When a wire comes from an empty, the outPin contains the empty
              // pin's location. The inPin is the handle.
              if (hitResult.hitPin.pinType === "in")
              {
                wire.inPin = hitResult.hitPin;
                wire.holdSource = "none";
                isItemHeld = false;
                refreshCanvas();
                break;
              }
              else if (hitResult.hitPin.pinType === "out")
              {
                wire.inPin = wire.outPin;
                wire.outPin = hitResult.hitPin;
                wire.holdSource = "none";
                isItemHeld = false;
                refreshCanvas();
                break;
              }
            }
            else
            {
              alert("Cannot attach wire from pin type " + wire.holdSource +
                " to pin type " + hitResult.hitPin.pinType + ".");
            }
          }
        }

        // Search for a empty pin collision
        for (let pin of emptyPins)
        {
          var hitResult = pin.checkForCollision(inputPos.x, inputPos.y);

          if (hitResult)
          {
            if (wire.holdSource === "in")
            {
              wire.outPin = pin;
              wire.holdSource = "none";
              isItemHeld = false;
              refreshCanvas();
              break;
            }
            else if (wire.holdSource === "out")
            {
              wire.inPin = pin;
              wire.holdSource = "none";
              isItemHeld = false;
              refreshCanvas();
              break;
            }
            else
            {
              alert("Cannot attach wire from pin type " + wire.holdSource +
              " to pin type empty.");
            }
          }
        }
      }
    }
  }

  isMouseDown = true;
}

function handleCanvasRightClickBegin(e)
{
  console.log("You right clicked!");
}

function handleCanvasMiddleClickBegin(e)
{
  isMousePanning = true;
}

function canvasMouseMove(e)
{
  if ("buttons" in e)
  {
    const MOUSE_BUTTON_LEFT = 1;
    const MOUSE_BUTTON_RIGHT = 2;
    const MOUSE_BUTTON_MIDDLE = 4;
    if (isMouseDown && (e.buttons & MOUSE_BUTTON_LEFT) == 0)
    {
      handleCanvasLeftClickEnd(e);
    }
    if (isMousePanning && (e.buttons & MOUSE_BUTTON_MIDDLE) == 0)
    {
      handleCanvasMiddleClickEnd(e);
    }
  }

  if (isItemHeld)
  {
    var screen = getScreenPositionRelativeToCanvasElement(e.pageX, e.pageY);
    var inputPos = getCanvasPointFromScreenPoint(screen.x, screen.y);

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
      else if (wire.holdSource === "out" || wire.holdSource === "empty")
      {
        wire.inPin.x = inputPos.x;
        wire.inPin.y = inputPos.y;
      }
    }

    refreshCanvas();
  }

  if (isMousePanning)
  {
    panPosition.x -= e.originalEvent.movementX * panSensitivity / zoomScale;
    panPosition.y -= e.originalEvent.movementY * panSensitivity / zoomScale;

    refreshCanvas();
  }
}

function canvasClickEnd(e)
{
  if ("button" in e)
  {
    // Note that button values are different from buttons value (note the plural)
    const MOUSE_BUTTON_LEFT = 0;
    const MOUSE_BUTTON_MIDDLE = 1;
    const MOUSE_BUTTON_RIGHT = 2;

    if (e.button == MOUSE_BUTTON_LEFT)
    {
      handleCanvasLeftClickEnd(e);
    }
    else if (e.button == MOUSE_BUTTON_RIGHT)
    {
      handleCanvasRightClickEnd(e);
    }
    else if (e.button == MOUSE_BUTTON_MIDDLE)
    {
      handleCanvasMiddleClickEnd(e);
    }
  }
}

function handleCanvasLeftClickEnd(e)
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

function handleCanvasRightClickEnd(e)
{

}

function handleCanvasMiddleClickEnd(e)
{
  isMousePanning = false;
  refreshCanvas();
}

function handleKeyPress(e)
{
  var key = e.key;
  //console.log(e.key);  // Easy way to determine key string

  if (key === "Escape")
  {
    cancelAllActions(e);
  }
}

function cancelAllActions(e)
{
  for (let gadget of gadgets)
  {
    gadget.isHeld = false;
  }
  for (let [i, wire] of wires.entries())
  {
    if (wire.holdSource !== "none")
    {
      wires.splice(i, 1);  // If a wire is being held, remove it completely.
    }
  }
  isItemHeld = false;
  refreshCanvas();
}

function handleMouseWheel(e)
{
  let wheelValue = e.originalEvent.deltaY;
  let screenPos = getScreenPositionRelativeToCanvasElement(e.pageX, e.pageY);
  let prevZoomScale = zoomScale;

  if (wheelValue > 0)  // Zooming out (wheel moving down)
  {
    zoomScale = zoomScale / (1 + Math.abs(wheelValue * zoomSensitivity));
  }
  else if (wheelValue < 0)  // Zooming in (wheel moving up)
  {
    zoomScale = zoomScale * (1 + Math.abs(wheelValue * zoomSensitivity));
  }

  // Pan to make sure canvas location at mouse cursor remains at cursor position after zoom
  panPosition.x += screenPos.x * (1 / prevZoomScale - 1 / zoomScale);
  panPosition.y += screenPos.y * (1 / prevZoomScale - 1 / zoomScale);

  refreshCanvas();
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
  var calc = new Gadget("calculator", "MyCalculator");
  calc.symbolImg.src = "assets/icons/symbols/logic/calculator.png";
  calc.x = 400;
  calc.y = 200;

  var timer = new Gadget("timer", "DelayTimer");
  timer.symbolImg.src = "assets/icons/symbols/logic/calculator.png";
  timer.x = 200;
  timer.y = 400;

  // DEV MODE empty pin for wire connecting
  var tempEmpty = new Pin("in", true);
  tempEmpty.x = 100;
  tempEmpty.y = 100;
  emptyPins.push(tempEmpty);

  // Assign input handlers
  canvas.mousedown(canvasClickBegin);
  canvas.contextmenu(function(e) {  // Disable context menu for the canvas element
    e.preventDefault();
  });
  $(document).mousemove(canvasMouseMove);
  canvas.mouseup(canvasClickEnd);
  $(document).keydown(handleKeyPress);
  canvas.bind("wheel", handleMouseWheel);

  // Add gadget objects
  gadgets.push(calc);
  gadgets.push(timer);

  // DEV MODE origin point indicator
  origin = new Origin(5);
}

$(init);