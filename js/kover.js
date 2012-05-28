/*
  Kover client library. 
*/

vertx.connection = null;
vertx.rpc_id = function() {
  id = typeof(id) != "undefined" ? id : 0;
  return id+=1;
};

vertx.connect = function(host, port, callback) {
    vertx.channel_name = "some-address";

    vertx.connection = new vertx.EventBus("http://"+ host + ":" + port + "/eventbus");

    vertx.connection.onopen = function() {
      console.log('connected');

      vertx.connection.registerHandler('some-address', function(message) {
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
                
                kover.rpc_exec(name + "." + method, params, function(message) {
                  func(message);  
                });
            }
          
          })(x, methods[x])
        }
      }

      callback();
    });
  },

  // sends json-rpc formatted string to an eventbus through sockjs
  rpc_exec: function(method_name, params, callback) {
    vertx.connection.send(
       vertx.channel_name, 
       kover.json_rpc_format(method_name, params, vertx.rpc_id()), function(message) {
         callback(message);
       }
     );
  },

  // formats given arguments in json-rpc format
  json_rpc_format: function(method_name, params, id) {
    return {"method": method_name, "params": params, "id": id}
  }
}