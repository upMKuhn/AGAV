class Input {
    constructor() {
        this.keyStates = {};
        this.keyComboSubscriber = [];
        this.mouseSubscriber = [];
        this.mouseWithKeyComboSubscriber = [];

        this.activeKeyComboSubscriberCache = [];
    }

    subscribeOnKeyCombo(keyNameArray, callback) {
        this.keyComboSubscriber.push({
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
        this.__clearSubscriberKeyComboCache();
        this.__setKeyState(eventArg.key, false);
        this.__onKeyStateChange();
    }
    
    onKeyDown(eventArg) {
        this.__clearSubscriberKeyComboCache();
        this.__setKeyState(eventArg.key, true);
        this.__onKeyStateChange();
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
        var notifiable = this.__getSubscribersWithActiveKeyCombo(this.keyComboSubscriber);
        for (var i = 0; i < notifiable.length; i++)
            notifiable[i].callback(this.keyStates);
    }

    //helper
    __getSubscribersWithActiveKeyCombo(subscriberList) {
        var result = [];
        if (this.__hasSubscriberKeyComboCache())
            result = this.__getSubscriberKeyComboCache();

        for (var i = 0; i < subscriberList.length; i++)
        {
            var subscriber = subscriberList[i];
            if (this.__isKeyComboActive(subscriber.combination)){
                result.push(subscriber);
            }
        }

        this.__setSubscriberKeyComboCache(result);
        return result;
    }

    __isKeyComboActive(keyNameArray) {
        var result = true;
        for (var i = 0; i < keyNameArray.length; i++)
        {
            let name = keyNameArray[i];
            result = result && this.__getKeyState(name);
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


    //Caching should be inside the subscriber collection 
    __setSubscriberKeyComboCache(list) {
        list.isUptoDate = true;
        this.activeKeyComboSubscriberCache = list;
    }

    __getSubscriberKeyComboCache(list) {
        return this.activeKeyComboSubscriberCache;
    }

    __clearSubscriberKeyComboCache() {
        this.activeKeyComboSubscriberCache.isUptoDate = false;
        this.activeKeyComboSubscriberCache.length = 0;
    }

    __hasSubscriberKeyComboCache() {
        return this.activeKeyComboSubscriberCache.isUptoDate;
    }


}