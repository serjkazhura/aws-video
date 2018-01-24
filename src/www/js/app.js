var appController = function() {

    var _config;

    var requestServiceWraper = function() {

        var beforeSendFactory = function(url, headers) {

            var isTrustedUrl = function(url) {
                if (url.match(`^${_config.apiBaseUrl}`)) {
                    return true;
                }
                return false;
            };

            var beforeSend = function(xhr){
                if (isTrustedUrl(url)) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('id_token'));
                }

                if (headers) {
                    for (var i = 0; i < headers.length; i++) {
                        var header = headers[i];
                        xhr.setRequestHeader(header.key, header.value);
                    }
                }
            };
            
            return {
                beforeSend: beforeSend
            }
        };

        var get = function(url, headers, callback) {

            var beforeSend = beforeSendFactory(url, headers).beforeSend;

            $.ajax({
                url: url,
                type: "GET",
                beforeSend: beforeSend,
                success: callback
             });
        };

        var post = function(url, headers, data, callback) {

            var beforeSend = beforeSendFactory(url, headers).beforeSend;

            $.ajax({
                type:'POST',
                url:url,
                dataType: 'json',
                contentType:"application/json",
                beforeSend: beforeSend,
                data:JSON.stringify(data),
                success: callback
            });
        };

        return {
            get: get,
            post: post
        }
    }();


    var authController = function() {

        var _webAuth;
        var _getUserEventHandler;;

        var setSession = function(authResult) {

            // Set the time that the access token will expire at
            var expiresAt = JSON.stringify(
                authResult.expiresIn * 1000 + new Date().getTime()
            );

            localStorage.setItem('access_token', authResult.accessToken);
            localStorage.setItem('id_token', authResult.idToken);
            localStorage.setItem('expires_at', expiresAt);

            getUser(authResult.accessToken);
        }

        var clearSession = function() {
            localStorage.removeItem('access_token');
            localStorage.removeItem('id_token');
            localStorage.removeItem('expires_at');
        };


        var isExpired = function() {
            var isExpired = true;
            var expiresAt = localStorage.getItem('expires_at');

            if (expiresAt) {
                var expiresAtTime = parseInt(expiresAt);
                var currentTime = new Date().getTime();

                if (expiresAtTime > currentTime){
                    isExpired = false;
                }
            }

            return isExpired;
        };

        var handleAuthentication = function() {

            var idToken = localStorage.getItem('access_token');
    
            if (idToken) {
                if (isExpired()){
                    clearSession();
                } else {
                    getUser(idToken);
                    return;
                }
            }

            _webAuth.parseHash(function(err, authResult) {
                if (authResult && authResult.accessToken && authResult.idToken) {
                    window.location.hash = '';
                    setSession(authResult);
                } else if (err) {
                    console.log(err);
                    alert(`Error: ${err.error}. Check the console for further details.`);
                }
            });
        };

        var getUser = function(idToken){
            _webAuth.client.userInfo(idToken, _getUserEventHandler);
        };

        var init = function(getUserEventHandler){
            _getUserEventHandler = getUserEventHandler;

            _webAuth = new auth0.WebAuth({
                domain: _config.auth0.domain,
                clientID: _config.auth0.clientId,
                redirectUri: _config.auth0.redirectUrl,
                audience: 'https://' + _config.auth0.domain + '/userinfo',
                responseType: 'token id_token',
                scope: 'openid profile'
            });

            handleAuthentication();
        };

        var authorize = function(){
            _webAuth.authorize();
        };

        return {
            init: init,
            authorize: authorize,
            clearSession: clearSession
        };
    }();

    var userController = function() {
        var uiElements = {
            loginButton: null,
            logoutButton: null,
            updateUserProfileButton: null,
            userEmailAddress: null,
            userFirstName: null,
            userLastName: null,
            profileButton: null,
            profileNameLabel: null,
            profileImage: null,
            uploadButton: null
        };
        
        var showUserAuthenticationDetails = function(err, profile) {
            if (err) {
                return alert('There was an error getting the profile: ' + err.message);
            }

            var showAuthenticationElements = !!profile;
    
            if (showAuthenticationElements) {
                uiElements.profileNameLabel.text(profile.nickname);
                uiElements.profileImage.attr('src', profile.picture);
                uiElements.uploadButton.css('display', 'inline-block');
            }
        
            uiElements.loginButton.toggle(!showAuthenticationElements);
            uiElements.logoutButton.toggle(showAuthenticationElements);
            uiElements.profileButton.toggle(showAuthenticationElements);
        };

        var initUIElements = function() {
            uiElements.loginButton = $('#auth0-login');
            uiElements.logoutButton = $('#auth0-logout');
            uiElements.profileButton = $('#user-profile');
            uiElements.profileNameLabel = $('#profilename');
            uiElements.profileImage = $('#profilepicture');
            uiElements.updateUserProfileButton = $('#user-profile-update');
            uiElements.userEmailAddress = $('#user-email-address');
            uiElements.userFirstName = $('#user-first-name');
            uiElements.userLastName = $('#user-last-name');
            uiElements.uploadButton = $('#upload-video-button');
        };

        var wireEvents = function(){
            uiElements.loginButton.click(function(e) {
                e.preventDefault();

                authController.authorize();
            });
    
            uiElements.logoutButton.click(function(e) {
                e.preventDefault();
    
                authController.clearSession();
    
                uiElements.logoutButton.hide();
                uiElements.profileButton.hide();
                uiElements.uploadButton.hide();
                uiElements.loginButton.show();
            });
    
            uiElements.profileButton.click(function(e) {
                var url = _config.apiBaseUrl + '/user-profile';
                var headers = [{
                    'key': 'x-ska-access-token',
                    'value' : localStorage.getItem('access_token')
                }];

                requestServiceWraper.get(url, headers, function(data, status) {
                  $('#user-profile-raw-json').text(JSON.stringify(data, null, 2));
                  $('#user-profile-modal').modal();
                });
            });

            uiElements.updateUserProfileButton.click(function(e){
                e.preventDefault;

                var url = _config.apiBaseUrl + '/user-profile';

                //todo: perform validation
                var data = {
                    name: uiElements.userFirstName.val() || '',
                    lastName: uiElements.userLastName.val() || '',
                    email: uiElements.userEmailAddress.val() || ''
                };

                var headers = [{
                    'key': 'x-ska-access-token',
                    'value' : localStorage.getItem('access_token')
                }];

                requestServiceWraper.post(url, headers, data, function(i) {
                    alert( "user profile is updated successfully");
                });
            });
        };

        var init = function() {
            initUIElements();
            wireEvents();
            authController.init(showUserAuthenticationDetails);
        };

        return {
            init: init
        };
    }();

    var videoController = function(){

        var uiElements = {
            videoCardTemplate: null,
            videoList: null,
            loadingIndicator: null
        };
        
        var addVideoToScreen = function (videoObjs) {
   
            $.each(videoObjs.urls, function(index, video) {
              var newVideoElement = uiElements.videoCardTemplate.clone().attr('id', video.firebaseId);
    
              newVideoElement.click(function() {
                  // the user has clicked on the video... let's play it, or pause it depending on state
                  var video = newVideoElement.find('video').get(0);
    
                  if (newVideoElement.is('.video-playing')) {
                      video.pause();
                      $(video).removeAttr('controls'); // remove controls
                  }
                  else {
                      $(video).attr('controls', ''); // show controls
                      video.play();
                  }
    
                  newVideoElement.toggleClass('video-playing');
              });
    
              newVideoElement.find('video').attr('src', video.url);
              newVideoElement.find('.transcoding-indicator').hide();
    
              uiElements.videoList.prepend(newVideoElement);
            });
        };

        var updateVideoOnScreen = function(firebaseId, videoObj) {
            var videoElement = getElementForVideo(firebaseId);
            if (!videoObj) {
                return;
            }
    
            if (videoObj.transcoding) {
                videoElement.find('video').hide();
                videoElement.find('.transcoding-indicator').show();
            } else {
                videoElement.find('video').show();
                videoElement.find('.transcoding-indicator').hide();
    
                getSignedUrls([{firebaseId: firebaseId, key: videoObj.key}], function(videos) {
                    videoElement.find('video').attr('src', videos[0].url);
                });
            }
        };

        var getSignedUrls = function(videoObjs, callback) {
            if (videoObjs) {
                var objectMap = $.map(videoObjs, function (video, firebaseId) {
                    return {firebaseId: firebaseId, key: video.key};
                });

                var getSignedUrl = _config.apiBaseUrl + '/signed-url';

                requestServiceWraper.post(getSignedUrl, null, JSON.stringify(objectMap), function(data, status) {
                    if (status === 'success') {
                        callback(data);
                    }
                });
            }
        };
        
        var getElementForVideo = function(videoId) {
            return $('#' + videoId);
        };

        var connectToFirebase = function () {
   
            firebase.initializeApp(_config.firebase);
    
            var isConnectedRef = firebase.database().ref(".info/connected");
    
            var nodeRef = firebase.database().ref();
            var childRef = firebase.database().ref('videos');
            //var nodeRef = firebaseRef.child('videos');
    
            isConnectedRef.on('value', function(snap) {
                if (snap.val() === true) {
                    uiElements.loadingIndicator.hide();
                }
            });
    
            nodeRef.on('value', function(result) {
                console.log(result.val());
            });
    
            // fired when a new movie is added to firebase
            nodeRef.on('child_added', function (childSnapshot) {
                getSignedUrls(childSnapshot.val(), addVideoToScreen);
            });
    
            // fired when a movie is updated
            childRef.on('child_changed', function (childSnapshot) {
                updateVideoOnScreen(childSnapshot.key, childSnapshot.val());
            });
        };

        var init = function() {
            uiElements.videoCardTemplate = $('#video-template');
            uiElements.videoList = $('#video-list');
            uiElements.loadingIndicator = $('#loading-indicator');

            connectToFirebase();
        };

        return {
            init: init
        };
        
    }();

    var uploadController = function() {

        var uiElements = {
            uploadButton: null,
            uploadButtonContainer: null,
            uploadProgressBar: null
        };
        
        var progress = function () {
            var xhr = $.ajaxSettings.xhr();
            xhr.upload.onprogress = function (evt) {
                var percentage = evt.loaded / evt.total * 100;
                $('#upload-progress').find('.progress-bar').css('width', percentage + '%');
            };
            return xhr;
        };

        //assume that we got an upload policy (data). try to upload the file.
        var upload = function (file, data) {

            uiElements.uploadButtonContainer.hide();
            uiElements.uploadProgressBar.show();
            uiElements.uploadProgressBar.find('.progress-bar').css('width', '0');
    
            var fd = new FormData();
            fd.append('key', data.key)
            fd.append('acl', 'private');
            fd.append('Content-Type', file.type);
            fd.append('AWSAccessKeyId', data.access_key);
            fd.append('policy', data.encoded_policy)
            fd.append('signature', data.signature);
            fd.append('file', file, file.name);
    
            $.ajax({
                url: data.upload_url,
                type: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                xhr: progress,
                beforeSend: function (req) {
                    req.setRequestHeader('Authorization', '');
                }
            }).done(function (response) {
                uiElements.uploadButtonContainer.show();
                uiElements.uploadProgressBar.hide();
                alert('Uploaded Finished');
            }).fail(function (response) {
                uiElements.uploadButtonContainer.show();
                uiElements.uploadProgressBar.hide();
                alert('Failed to upload');
            });
        };

        var wireEvents = function () {
   
            uiElements.uploadButton.on('change', function (result) {
                var file = $('#upload').get(0).files[0];
                var requestDocumentUrl = _config.apiBaseUrl + '/s3-policy-document?filename=' + encodeURI(file.name);
                
                //get upload policy first
                requestServiceWraper.get(requestDocumentUrl, null, function (data, status) {
                    upload(file, data)
                });
            });
        };

        var init = function () {
            uiElements.uploadButton = $('#upload');
            uiElements.uploadButtonContainer = $('#upload-video-button');
            uiElements.uploadProgressBar = $('#upload-progress');
    
            wireEvents();
        };

        return {
            init: init
        };
    }();

    var init = function(cfg){
        _config = cfg;
        userController.init();
        videoController.init();
        uploadController.init();
    }

    return {
        init: init
    };

}();