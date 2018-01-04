var appController = function(){

    var _config;

    var configureAuthenticatedRequests = function() {
        $.ajaxSetup({
            'beforeSend': function(xhr) {
              xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('id_token'));
            }
        });
    };

    var authController = function(){

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

        var handleAuthentication = function() {
            var idToken = localStorage.getItem('access_token');
    
            if (idToken) {
                getUser(idToken);
                return;
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
            configureAuthenticatedRequests();
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
            profileButton: null,
            profileNameLabel: null,
            profileImage: null
        };
        
        var showUserAuthenticationDetails = function(err, profile) {
            if (err) {
                return alert('There was an error getting the profile: ' + err.message);
            }

            var showAuthenticationElements = !!profile;
    
            if (showAuthenticationElements) {
                uiElements.profileNameLabel.text(profile.nickname);
                uiElements.profileImage.attr('src', profile.picture);
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
                uiElements.loginButton.show();
            });
    
            uiElements.profileButton.click(function(e) {
                var url = _config.apiBaseUrl + '/user-profile';
          
                $.get(url, function(data, status) {
                  $('#user-profile-raw-json').text(JSON.stringify(data, null, 2));
                  $('#user-profile-modal').modal();
                })
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

    var init = function(cfg){
        _config = cfg;
        userController.init();
    }

    return {
        init: init
    };

}();