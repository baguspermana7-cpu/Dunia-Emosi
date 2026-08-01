
(function()
{
    'use strict';
    var t;
    
    function ResetClass()
    {
        this.Container_constructor();

        t = this;
        this.initialize();

    };
    var reset = c.extend(ResetClass, c.Container);
    reset.initialize=function() {

     //   setTimeout(onDispatch,100)
    };
    reset.init=()=>{
        t.dispatchEvent({param: Step1, type:'changePage',bubbles:true,cancelable:true});
    }
      function onDispatch(){


    }
    window.ResetClass = c.promote(ResetClass, "Container");
    

}());
