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
var items = [];
var isMouseDown = false;

var calc = {
  img: new Image(),
  x: 100,
  y: 100,
  offsetX: 0,
  offsetY: 0,
  width: 0,
  height: 0,
  isHeld: false,
  handleImageLoad: function (){
    drawImageOnCanvas(this.img, this.x, this.y);
  }
}

function refreshCanvas()
{
  context.clearRect(0, 0, canvas.width(), canvas.height());
  for (let item of items)
  {
    drawImageOnCanvas(item.img, item.x, item.y);
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
 * Canvas Handlers
 *********************************************************/
function canvasClickBegin(e)
{
  x = e.offsetX;
  y = e.offsetY;

  for (let item of items)
  {
    if (x > item.x &&
        x < item.x + item.width &&
        y > item.y &&
        y < item.y + item.height)
    {
      console.log("Detected a click on item.");
      item.isHeld = true;

      item.offsetX = x - item.x;
      item.offsetY = y - item.y;
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

    for (let item of items)
    {
      if (item.isHeld)
      {
        item.x = x - item.offsetX;
        item.y = y - item.offsetY;

        // Left bounds
        if (item.x < 0)
        {
          item.x = 0;
        }
        // Right bounds
        if (item.x + item.width > canvas.width())
        {
          item.x = canvas.width() - item.width;
        }
        // Top Bounds
        if (item.y < 0)
        {
          item.y = 0;
        }
        // Bottom bounds
        if (item.y + item.height > canvas.height())
        {
          item.y = canvas.height() - item.height;
        }
      }
    }

    refreshCanvas();
  }
}

function canvasClickEnd(e)
{
  for (let item of items)
  {
    if (item.isHeld)
    {
      item.isHeld = false;
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

  calc.img.onload = $.proxy(calc.handleImageLoad, calc);
  calc.img.src = "assets/icons/Calculator_prototype.png";
  calc.width = calc.img.naturalWidth;
  calc.height = calc.img.naturalHeight;

  canvas.mousedown(canvasClickBegin);
  canvas.mousemove(canvasMouseMove);
  canvas.mouseup(canvasClickEnd);

  items.push(calc);
}

$(init);