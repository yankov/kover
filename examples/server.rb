# vertx run examples/server.rb -cluster -cluster-port 25501

require "../ruby/kover.rb"
require "examples/user.rb"
require "examples/post.rb"

Kover.run
