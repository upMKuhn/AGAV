class Input {
    constructor() {
        this.keyStates = {};
        this.keyComboSubscriber = [];
        this.keyDownSubscriber = {};
        this.mouseSubscriber = [];
        this.mouseWithKeyComboSubscriber = [];

        this.initKeyStates();
    }

    initKeyStates() {

        this.__setKeyState("alt", false);
        this.__setKeyState("shift", false);
        this.__setKeyState("leftMouseBtn", false);
        this.__setKeyState("middleMouseBtn", false);
        this.__setKeyState("ArrowDown", false);
        this.__setKeyState("ArrowUp", false);
        this.__setKeyState("ArrowRight", false);
        this.__setKeyState("ArrowLeft", false);

    }

    subscribeOnKeyDown(keyName, callback) {
        keyName = keyName.toLowerCase();
        this.keyDownSubscriber[keyName] = getOrDefault(this.keyDownSubscriber[keyName], []);
        this.keyDownSubscriber[keyName].push(callback);
    }


    subscribeOnKeyCombo(keyName, callback) {
        this.keyDownSubscriber.push({
            combination: keyNameArray,
            callback: callback
        });
    }

    subscribeToMouseMovement(callback) {
        this.mouseSubscriber.push(callback);
    }

    subscribeToMouseMovementWithKeyCombo(keyNameArray, callback) {
        this.mouseWithKeyComboSubscriber.push({
            combination: keyNameArray,
            callback: callback
        });
    }

    //Eventhandler
    onMouseMove(eventArg) {
        var notifiable = this.mouseSubscriber;
        this.__raiseMouseEvent(eventArg.pageX, eventArg.pageY);
        this.__raiseMouseWithKeyComboEvent(eventArg.pageX, eventArg.pageY);

    }

    onMouseDown(eventArg) {
        switch (eventArg.which) {
            case 1:
                this.__setKeyState("leftMouseBtn", true);
                break;
            case 2:
                this.__setKeyState("middleMouseBtn", true);
                break;
            case 3:
                this.__setKeyState("rightMouseBtn", true);
                break;
        }
        this.__onKeyStateChange();
    }

    onMouseUp(eventArg) {
        switch (eventArg.which) {
            case 1:
                this.__setKeyState("leftMouseBtn", false);
                break;
            case 2:
                this.__setKeyState("middleMouseBtn", false);
                break;
            case 3:
                this.__setKeyState("rightMouseBtn", false);
                break;
        }
        this.__onKeyStateChange();
    }

    onKeyUp(eventArg) {
        this.__setKeyState(eventArg.key, false);
        this.__onKeyStateChange();
    }
    
    onKeyDown(eventArg) {
        this.__setKeyState(eventArg.key, true);
        this.__onKeyStateChange();
        this.__notifyKeyStateDownSubscriber();
    }

    __raiseMouseEvent(mouseX, mouseY) {
        var notifiable = this.mouseSubscriber;
        for (var i = 0; i < notifiable.length; i++)
            notifiable[i](mouseX, mouseY);
    }

    __raiseMouseWithKeyComboEvent(mouseX, mouseY) {
        var notifiable = this.__getSubscribersWithActiveKeyCombo(this.mouseWithKeyComboSubscriber);
        for (var i = 0; i < notifiable.length; i++)
            notifiable[i].callback(mouseX, mouseY, this.keyStates);
    }

    __onKeyStateChange() {
        //keyComboSubscriber 
        var notifiable = this.__getSubscribersWithActiveKeyCombo(this.keyComboSubscriber);
        for (var i = 0; i < notifiable.length; i++)
            notifiable[i].callback(this.keyStates);

    }

    //helper
    __notifyKeyStateDownSubscriber() {
        
        for (var keyName in this.keyStates)
        {
            if (this.__getKeyState(keyName)) {
                var subscriber = this.keyDownSubscriber[keyName];
                for (var i = 0; i < subscriber.length; i++) {
                    subscriber[i]();
                }
            }
        }
    }


    __getSubscribersWithActiveKeyCombo(subscriberList) {
        var result = [];

        for (var i = 0; i < subscriberList.length; i++)
        {
            var subscriber = subscriberList[i];
            if (this.__isKeyComboActive(subscriber.combination)){
                result.push(subscriber);
            }
        }

        return result;
    }

    __isKeyComboActive(keyComboNameArray) {
        var result = true;
        keyComboNameArray = keyComboNameArray.map(function (x) { return x.toLowerCase() });

        for (var key in this.keyStates) {
            var keyState = this.keyStates[key];
            var inCombo = keyComboNameArray.indexOf(key) != -1;

            if (keyState || inCombo)
                result = result && (keyState && inCombo);
        }
        return result;
    }

    __setKeyState(keyName, isDown) {
        keyName = keyName.toLowerCase();
        this.keyStates[keyName] = isDown;
    }

    __getKeyState(keyName) {
        keyName = keyName.toLowerCase();
        this.keyStates[keyName] = getOrDefault(this.keyStates[keyName], false);
        return this.keyStates[keyName];
    }

}