/* Dreams Circuit Creator
 *
 * Created by Kyle Kaja (ArcticNinja73; PSN: TheHiddenSpectre)
 *
 * View source at https://github.com/kkaja123/DreamsCircuitCreator
 */

const canvas = $("#graphics");
const context = canvas[0].getContext("2d");;

function refreshCanvas()
{

}

function init()
{
  canvas.attr({
    width: window.innerWidth,
    height: window.innerHeight,
  });


}

$(init);