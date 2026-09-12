export type InputAction='up'|'down'|'left'|'right'|'confirm'|'back'|'pause'|'previousSection'|'nextSection';
const keys:Readonly<Record<string,InputAction>>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'confirm',Escape:'back',KeyP:'pause',KeyQ:'previousSection',KeyE:'nextSection'};
export function keyboardAction(code:string):InputAction|null{return keys[code]??null;}
export function controllerAction(buttons:readonly boolean[],axes:readonly number[]):InputAction|null{
 if(buttons[0])return 'confirm';if(buttons[1])return 'back';if(buttons[9])return 'pause';if(buttons[4])return 'previousSection';if(buttons[5])return 'nextSection';
 if(buttons[12])return 'up';if(buttons[13])return 'down';if(buttons[14])return 'left';if(buttons[15])return 'right';
 const x=axes[0]??0,y=axes[1]??0;
 if(Math.max(Math.abs(x),Math.abs(y))<.55)return null;
 return Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'up':'down';
}
