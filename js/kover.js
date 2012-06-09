/*
  Kover client library. 
*/

vertx.connection = null;

vertx.rpc_id = function() {
  id = typeof(id) != "undefined" ? id : 0;
  return id+=1;
};

vertx.connect = function(host, port, callback) {
    vertx.user_channel = "eventbus"; 
    vertx.eventbus_channel = "eventbus";

    vertx.connection = new vertx.EventBus("http://"+ host + ":" + port + "/eventbus");

    vertx.connection.onopen = function() {
      console.log('connected');

      vertx.connection.registerHandler("public_events", function(message) {
        console.log('received a message: ' + JSON.stringify(message));

        if (message.event) {
          kover.Events.trigger(message.event, window, message.data);
          kover.Events.updateSubscribersFor(message.event, message.data);
        }

      });
      
      callback();

    };

    vertx.connection.onclose = function() {
      console.log("Not connected");
    };

}

var kover = {
  run: function(settings, callback) {
    
    kover.settings = settings;

    kover.View.handleElements();

    vertx.connect(settings.host, settings.port, function() {
      kover.requireList(settings.require, callback)
    });
  },

  assignHandlers: function(o, tagname, event_name) {
    elements = o.getElementsByTagName(tagname);

    for (e=0; e<elements.length; e++) {
      elements[e].href = "javascript:void(0)";

      if (elements[e].getAttribute('call') == null) continue;

      // TODO: zomg is there way to make it simple?
      elements[e][event_name] = function() {

          params = this.tagName == "FORM" ? kover.Forms.getParams(this) : kover.parseParams(this);

          kover.rpc_exec(this.getAttribute('call').replace(/\(.*\)/,''), 
            params,
            (function(that){
              return function(message){
                kover.View.render(that.tplName() + '.ejs', message, that.tplClassName());
              };
            })(this)
        )
          return false;
      } 
    }
  },

  getEventSubscribers: function(o) {
    elements = o.getElementsByTagName("*");

    for (i=0; i<elements.length; i++) {

      eventName = elements[i].getSubscription();
      
      if (eventName != null) { 
        kover.Events.findOrCreate( eventName )
        kover.Events.events[eventName].subscribers.push(elements[i]);
      }

    }
  },

  parseParams: function(obj) {
     params = obj.getAttribute('call').match(/\(.*\)/) || obj.getAttribute('params')

     params = params instanceof Array ? params[0] : params;

     if (!params) return [];

     params = params.replace(/\(|\)/g,'').split(/\ ?,\ ?/);
     
     return params.map(function(param){
       try {
         param = eval(param);
         return param;
       } 
       catch(err) {
         return param;
       }
     });

  },


  // function that creates stubs for methods of the required class
  require: function(name, callback) {  
    kover.rpc_exec(name + '.rpc_white_list', [], function(stub){

      stub = stub || {result:[]};

      obj = {};

      //create stubs for methods
      for(i in stub.result) {
        method = stub.result[i];

        obj[method] = (function(method){
         return function() {      
            params = Array.prototype.slice.call(arguments);

            func = arguments[arguments.length - 1];
          
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

                if (typeof arguments[arguments.length - 1] === "function") {
                  func = arguments[arguments.length - 1]  
                } else {
                  func = null;
                }

                kover.rpc_exec(class_name + "." + method, params, function(message) {
                  if (func) func(message);
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

         if (message.error) throw method_name + ": " + message.error;

         kover.Events.trigger(method_name + ":complete", window, message); 
         kover.Events.updateSubscribersFor(method_name + ":complete", message);
        
         callback(message);
       }
     );
  },

  // formats given arguments in json-rpc format
  json_rpc_format: function(method_name, params, id) {
    return {"method": method_name, "params": params, "id": id};
  }
}


/* 
   A simple template rendering system
*/

kover.View = {

  // loads contents of static file 
  loadFile: function(filename, callback) {

    // wanted to be as lightweight as possible, 
    // so no fancy jQuery in here for now.
    var client = new XMLHttpRequest();
    client.open('GET', kover.settings.templates + '/' + filename, false);
    client.onreadystatechange = function() {
      callback(client.responseText);
    }
    client.send(null);
  },

  cache: {},  

  tmpl: function(str, data){
    var fn = !/\W/.test(str) ?
      kover.View.cache[str] = kover.View.cache[str] ||
        kover.View.tmpl(document.getElementById(str).innerHTML) :
      
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +
        
        "with(obj){p.push('" +
        
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");
    
    return data ? fn( data ) : fn;
  },

  render: function(filename, data, selector) {

    //TODO: support complex selectors: class, tagname, etc.
    kover.View.loadFile(filename, function(content){
       els = document.getElementsByClassName(selector);

       for (i=0; i<els.length; ++i) {
         els[i].innerHTML = kover.View.tmpl(content, data);
       }
        
    });
  },

  // exec neccesarry JS for a new template
  handleElements: function(o) {
    o = o || document;

    kover.assignHandlers(o, "a", "onclick");
    kover.assignHandlers(o, "form", "onsubmit");
    kover.getEventSubscribers(o);
  }

}

kover.Forms = {
  getParams: function(o) {
    f_params = {}
    for(i=0;i<o.elements.length;++i) {

      value = o.elements[i]['value'];
      name = o.elements[i]['name'];

      if (name && value) {
        f_params[o.elements[i]['name']] = o.elements[i]['value'];
      }
    }  

    return f_params;
  }
}


kover.Events = {
  events: {},

  findOrCreate: function(event_name) {
    if (kover.Events.events[event_name]) return kover.Events.events[event_name];

    return kover.Events.createEvent(event_name);
  },

  createEvent: function(event_name) {
    var event;
    
    if (document.createEvent) {
      event = document.createEvent("HTMLEvents");
      event.initEvent(event_name, true, true);
    } else {
      event = document.createEventObject();
      event.eventType = event_name;
    }

    event.eventName = event_name;
    event.memo = {};    
    event['subscribers'] = [];

    kover.Events.events[event_name] = event;

    return event;
  },

  trigger: function(event_name, o, data) {
    o = o || window;
    data = data || {};

    event = kover.Events.findOrCreate(event_name);
    event.memo = data;

    if (document.createEvent) {
      o.dispatchEvent(event);
    } else {
      o.fireEvent("on" + event.eventType, event);
    }
  },

  updateSubscribersFor: function(eventName, data) {
    var e = kover.Events.events[eventName];

    for (var i=0; i<e.subscribers.length; i++) {
      e.subscribers[i].updateFromEvent(eventName, data);
    }

  }
}

// gets a template name based on class 
Element.prototype.tplName = function() {
  if (this.getAttribute('tpl')) {
    return this.getAttribute('tpl');
  }
  else if (this.getAttribute('call')) {
    return this.getAttribute('call').replace(/\(.*\)/,'').replace(/\./, '/');
  } 

  return "default";
}

Element.prototype.tplClassName = function() {
  return this.tplName().replace(/\//, '-');
}

Element.prototype.render = function(filename, data, type) {
  (function(that){
    kover.View.loadFile(filename, function(content){      
      if (type == 'append') 
        that.innerHTML += kover.View.tmpl(content, data);
      else if (type == 'prepend')
        that.innerHTML = kover.View.tmpl(content, data) + that.innerHTML;
      else
        that.innerHTML = kover.View.tmpl(content, data);

      kover.View.handleElements(that);

    });
  })(this);
  
}

Element.prototype.triggerEvent = function(event_name, data) {
  kover.Events.trigger(event_name, this, data);
}

Element.prototype.getRenderType = function() {
  return this.getAttribute('append-on')  &&  "append"   || 
         this.getAttribute('prepend-on') &&  "prepend"  || "replace";
}
Element.prototype.getSubscription = function() {
  return this.getAttribute( this.getRenderType() + "-on" ) || null;
}

Element.prototype.updateFromEvent = function(eventName, data) {
  this.render(this.tplName() + '.ejs', data, this.getRenderType());
}

