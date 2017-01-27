class MyCanvas
{
    constructor(canvasId, InputClass)
    {
        this.$canvas = $('#' + canvasId);
        this.canvas = this.$canvas[0];
        this.input = InputClass;
        this.canvasFocused = false;
        this.mouseWheelUpSubscriber = Factory("EventHandlerCollection");
        this.mouseWheelDownSubscriber = Factory("EventHandlerCollection");


        this.$canvas.focus(makeCallback(this, this.__onFocus))
        this.$canvas.blur(makeCallback(this, this.__onBlur))

        //setup child class... wire the class up as it has no knowleadge of the html behind
        $(document).keydown(makeCallback(InputClass, InputClass.onKeyDown));
        $(document).keyup(makeCallback(InputClass, InputClass.onKeyUp));
        this.$canvas.mousemove(makeCallback(InputClass, InputClass.onMouseMove));
        this.$canvas.mousedown(makeCallback(InputClass, InputClass.onMouseDown));
        this.$canvas.mouseup(makeCallback(InputClass, InputClass.onMouseUp));
        $(document).bind("mousewheel", makeCallback(this, this.__onMouseWheelScroll));

        this.__onWindowResize();
        $(window).resize(makeCallback(this, this.__onWindowResize));
    }

    subscribeOnKeyCombo(keyCombo, callback) {
        this.input.subscribeOnKeyCombo(keyCombo, callback);
    }

    subscribeToMouseMovement(callback) {
        var wrappedCallback = this.__WrapWithCoordinateConversion(callback);
        subscribeToMouseMovement(wrappedCallback);
    }

    subscribeToMouseMovementWithKeyCombo(keyCombo, callback) {
        var wrappedCallback = this.__WrapWithCoordinateConversion(callback);
        this.input.subscribeToMouseMovementWithKeyCombo(keyCombo, wrappedCallback);
    }

    subscribeToMouseWheelUp(callback) {
        this.mouseWheelUpSubscriber.add(callback);
    }

    subscribeToMouseWheelDown(callback) {
        this.mouseWheelDownSubscriber.add(callback);
    }

    hasFocus() { return this.canvasFocused; }


    __WrapWithCoordinateConversion(callback) {
        var warpper = function (pageX, pageY)
        {
            var position = this.$canvas.position();
            var args = Array.prototype.slice.call(arguments, 0);
            pageX = getOrDefault(pageX, 0);
            pageY = getOrDefault(pageY, 0);
            args[0] = pageX - position.left;
            args[1] = pageY - position.top;

            this.wrappedCallback.apply(window, args);
        }
        return warpper.bind({
            $canvas: this.$canvas,
            wrappedCallback: callback,
            isCanvasFocused: makeCallback(this, this.hasFocus)
        });
    }

    __onWindowResize() {
        var widthDisplay = this.canvas.clientWidth;
        var heightDisplay = this.canvas.clientHeight;

            this.canvas.height = heightDisplay;
            this.canvas.width = widthDisplay;
    }

    __onFocus() { this.canvasFocused = true; }
    __onBlur() { this.canvasFocused = false; }

    __onMouseWheelScroll(eventArg) {
        if (eventArg.originalEvent.wheelDelta < 0) {
            this.mouseWheelDownSubscriber.raise();
        } else {
            this.mouseWheelUpSubscriber.raise();
        }
    }

}

