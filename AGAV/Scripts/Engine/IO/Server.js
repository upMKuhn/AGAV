class Server {



    get(path, successCallback, errorCallback) {
        $.ajax({
            url: path,
            cache: false,
            success: successCallback,
            error: errorCallback,
        });
    }

}