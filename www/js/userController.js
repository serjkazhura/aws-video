var userController = function(){

    var webAuth;
    var config;

    var uiElements = {
        loginButton: null,
        logoutButton: null,
        profileButton: null,
        profileNameLabel: null,
        profileImage: null
      };
    
    var configureAuthenticatedRequests = function() {
        $.ajaxSetup({
            'beforeSend': function(xhr) {
              xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('userToken'));
            }
        });
    };

    var showUserAuthenticationDetails = function(profile) {
        var showAuthenticationElements = !!profile;

        if (showAuthenticationElements) {
          uiElements.profileNameLabel.text(profile.nickname);
          uiElements.profileImage.attr('src', profile.picture);
        }
    
        uiElements.loginButton.toggle(!showAuthenticationElements);
        uiElements.logoutButton.toggle(showAuthenticationElements);
        uiElements.profileButton.toggle(showAuthenticationElements);
    };

    var wireEvents = function(){
        uiElements.loginButton.click(function(e) {
            e.preventDefault();
            webAuth.authorize();
        });

        uiElements.logoutButton.click(function(e) {
            e.preventDefault();

            localStorage.removeItem('access_token');
            localStorage.removeItem('id_token');
            localStorage.removeItem('expires_at');

            uiElements.logoutButton.hide();
            uiElements.profileButton.hide();
            uiElements.loginButton.show();
        });

        uiElements.profileButton.click(function(e) {
            var url = config.apiBaseUrl + '/user-profile';
      
            $.get(url, function(data, status) {
              $('#user-profile-raw-json').text(JSON.stringify(data, null, 2));
              $('#user-profile-modal').modal();
            })
          });
    };

    var getUser = function(idToken){
        configureAuthenticatedRequests();

        webAuth.client.userInfo(idToken, function(err, profile) {
          if (err) {
            return alert('There was an error getting the profile: ' + err.message);
          }
          showUserAuthenticationDetails(profile);
        });
    };

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

    var handleAuthentication = function() {
        webAuth.parseHash(function(err, authResult) {
          if (authResult && authResult.accessToken && authResult.idToken) {
            window.location.hash = '';
            setSession(authResult);
          } else if (err) {
            console.log(err);
            alert(
              'Error: ' + err.error + '. Check the console for further details.'
            );
          }
        });
    };

    var init = function(cfg) {
        config = cfg;

        webAuth = new auth0.WebAuth({
            domain: config.auth0.domain,
            clientID: config.auth0.clientId,
            redirectUri: config.auth0.redirectUrl,
            audience: 'https://' + config.auth0.domain + '/userinfo',
            responseType: 'token id_token',
            scope: 'openid profile'
          });

        uiElements.loginButton = $('#auth0-login');
        uiElements.logoutButton = $('#auth0-logout');
        uiElements.profileButton = $('#user-profile');
        uiElements.profileNameLabel = $('#profilename');
        uiElements.profileImage = $('#profilepicture');

        var idToken = localStorage.getItem('access_token');

        if (idToken) {
            getUser(idToken);
        }

        wireEvents();
        handleAuthentication();
    };


    return {
        init: init
    };

}();