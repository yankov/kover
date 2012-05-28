# vertx run eventbus.rb -cluster

require 'vertx'

server = Vertx::HttpServer.new;
sockJSServer = Vertx::SockJSServer.new(server)
c = sockJSServer.bridge({'prefix' => '/eventbus'}, [{}] ) 

server.listen(8080)
