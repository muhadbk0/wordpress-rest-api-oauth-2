'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
	function _class(config) {
		_classCallCheck(this, _class);

		this.url = config.rest_url ? config.rest_url : config.url + 'wp-json';
		this.url = this.url.replace(/\/$/, '');
		this.credentials = config.credentials;
		this.scope = config.scope || null;

		if (!this.credentials.type) {
			this.credentials.type = this.credentials.client.secret ? 'code' : 'token';
		}
		this.config = config;
	}

	_createClass(_class, [{
		key: 'getConsumerToken',
		value: function getConsumerToken() {
			var _this = this;

			if (!this.config.brokerCredentials) {
				throw new Error('Config does not include a brokerCredentials value.');
			}

			this.config.credentials.client = this.config.brokerCredentials.client;
			return this.post(this.config.brokerURL + 'broker/connect', {
				server_url: this.config.url
			}).then(function (data) {

				if (data.status && data.status === 'error') {
					throw { message: 'Broker error: ' + data.message, code: data.type };
				}
				_this.config.credentials.client = {
					id: data.client_token,
					secret: data.client_secret
				};

				return data;
			});
		}
	}, {
		key: 'getRedirectURL',
		value: function getRedirectURL() {
			if (!this.config.callbackURL) {
				throw new Error('Config does not include a callbackURL value.');
			}

			var args = {
				response_type: this.credentials.type,
				client_id: this.credentials.client.id,
				redirect_uri: this.config.callbackURL
			};
			if (this.scope) {
				args.scope = this.scope;
			}
			return this.config.url + 'wp-login.php?action=oauth2_authorize&' + _qs2.default.stringify(args);
		}
	}, {
		key: 'getAccessToken',
		value: function getAccessToken(oauthVerifier) {
			var _this2 = this;

			return this.post(this.config.url + 'oauth2/access', {
				oauth_verifier: oauthVerifier
			}).then(function (data) {
				_this2.config.credentials.token = {
					public: data.oauth_token,
					secret: data.oauth_token_secret
				};

				return _this2.config.credentials.token;
			});
		}
	}, {
		key: 'getAuthorizationHeader',
		value: function getAuthorizationHeader() {
			return { Authorization: 'Bearer ' + this.config.credentials.token.public };
		}
	}, {
		key: 'authorize',
		value: function authorize(next) {

			var args = {};
			var savedCredentials = window.localStorage.getItem('requestTokenCredentials');
			if (window.location.href.indexOf('?')) {
				args = _qs2.default.parse(window.location.href.split('?')[1]);
			}

			// Parse implicit token passed in fragment
			if (window.location.href.indexOf('#') && this.config.credentials.type === 'token') {
				args = _qs2.default.parse(window.location.hash.substring(1));
			}

			if (!this.config.credentials.client) {
				return this.getConsumerToken().then(this.authorize.bind(this));
			}

			if (this.config.credentials.token && this.config.credentials.token.public) {
				return Promise.resolve("Success");
			}

			if (savedCredentials) {
				this.config.credentials = JSON.parse(savedCredentials);
				window.localStorage.removeItem('requestTokenCredentials');
			}

			if (args.access_token) {
				this.config.credentials.token = {
					public: args.access_token
				};
				return Promise.resolve(this.config.credentials.token);
			}

			if (!this.config.credentials.token && !savedCredentials) {
				console.log(savedCredentials);
				window.localStorage.setItem('requestTokenCredentials', JSON.stringify(this.config.credentials));
				window.location = this.getRedirectURL();
				throw 'Redirect to authrization page...';
			} else if (!this.config.credentials.token && args.access_token) {
				this.config.credentials.token.public = args.access_token;
				return this.getAccessToken(args.oauth_verifier);
			}
		}
	}, {
		key: 'saveCredentials',
		value: function saveCredentials() {
			window.localStorage.setItem('tokenCredentials', JSON.stringify(this.config.credentials));
		}
	}, {
		key: 'removeCredentials',
		value: function removeCredentials() {
			delete this.config.credentials.token;
			window.localStorage.removeItem('tokenCredentials');
		}
	}, {
		key: 'hasCredentials',
		value: function hasCredentials() {
			return this.config.credentials && this.config.credentials.client && this.config.credentials.client.public && this.config.credentials.client.secret && this.config.credentials.token && this.config.credentials.token.public && this.config.credentials.token.secret;
		}
	}, {
		key: 'restoreCredentials',
		value: function restoreCredentials() {
			var savedCredentials = window.localStorage.getItem('tokenCredentials');
			if (savedCredentials) {
				this.config.credentials = JSON.parse(savedCredentials);
			}
			return this;
		}
	}, {
		key: 'get',
		value: function get(url, data) {
			return this.request('GET', url, data);
		}
	}, {
		key: 'post',
		value: function post(url, data) {
			return this.request('POST', url, data);
		}
	}, {
		key: 'del',
		value: function del(url, data, callback) {
			return this.request('DELETE', url, data);
		}
	}, {
		key: 'request',
		value: function request(method, url) {
			var data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

			if (url.indexOf('http') !== 0) {
				url = this.url + url;
			}

			if (method === 'GET' && data) {
				url += '?' + decodeURIComponent(_qs2.default.stringify(data));
				data = null;
			}

			var headers = {
				Accept: 'application/json'
			};

			var requestUrls = [this.config.url + 'oauth1/request'];

			/**
    * Only attach the oauth headers if we have a request token, or it is a request to the `oauth/request` endpoint.
    */
			if (this.config.credentials.token || requestUrls.indexOf(url) > -1) {
				headers = _extends({}, headers, this.getAuthorizationHeader());
			}

			return fetch(url, {
				method: method,
				headers: headers,
				mode: 'cors',
				body: ['GET', 'HEAD'].indexOf(method) > -1 ? null : _qs2.default.stringify(data)
			});
		}
	}]);

	return _class;
}();

exports.default = _class;