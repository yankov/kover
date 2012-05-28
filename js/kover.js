/*
  Kover client library. 
*/

vertx.connection = null;
vertx.rpc_id = function() {
  id = typeof(id) != "undefined" ? id : 0;
  return id+=1;
};

vertx.createUUID = function () {
  // http://www.ietf.org/rfc/rfc4122.txt
  var s = [];
  var hexDigits = "0123456789abcdef";
  for (var i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = "-";

  var uuid = s.join("");
  return uuid;
}

vertx.connect = function(host, port, callback) {
    vertx.user_channel = "eventbus"; //vertx.createUUID();
    vertx.eventbus_channel = "eventbus";

    vertx.connection = new vertx.EventBus("http://"+ host + ":" + port + "/eventbus");

    vertx.connection.onopen = function() {
      console.log('connected');

      vertx.connection.registerHandler(vertx.user_channel, function(message) {
        console.log('received a message: ' + JSON.stringify(message));
      });
      
      callback();

    };

    vertx.connection.onclose = function() {
      console.log("Not connected");
    };

}


var kover = {
  run: function(settings, callback) {
    vertx.connect(settings.host, settings.port, function() {
      kover.requireList(settings.require, callback)
    });
  },

  // function that creates stubs for methods of the required class
  require: function(name, callback) {  
    kover.rpc_exec(name + '.rpc_white_list', [], function(stub){

      stub = stub || {result:[]}

      obj = {}

      //create stubs for methods
      for(i in stub.result) {
        method = stub.result[i];

        obj[method] = (function(method){
         return function() {      
            params = Array.prototype.slice.call(arguments);

            func = arguments[arguments.length - 1]
            
            kover.rpc_exec(name + "." + method, params, function(message) {
              func(message);  
            })
           }
        })(method);
      }

      callback(obj);
    });
  },

  // create stubs for an array of classes
  requireList: function(list, callback) {  
    kover.rpc_exec('Kover.rpc_white_list_for', [list], function(stub){
      stub = stub || {result:[]}

      //create stubs for methods
      for(i in stub.result) {
        methods = stub.result[i];
        for (x in methods) {
          (function(class_name, method) {
            window[i] = window[i] || {}
            window[i][method] = function() {      
                params = Array.prototype.slice.call(arguments);

                func = arguments[arguments.length - 1]
                
                kover.rpc_exec(class_name + "." + method, params, function(message) {
                  func(message);  
                });
            }
          
          })(i, methods[x])
        }
      }

      callback();
    });
  },

  // sends json-rpc formatted string to an eventbus through sockjs
  rpc_exec: function(method_name, params, callback) {
    vertx.connection.send(
       vertx.eventbus_channel, 
       kover.json_rpc_format(method_name, params, vertx.rpc_id()), function(message) {
         callback(message);
       }
     );
  },

  // formats given arguments in json-rpc format
  json_rpc_format: function(method_name, params, id) {
    return {"method": method_name, "params": params, user_channel: vertx.user_channel, "id": id}
  }
}