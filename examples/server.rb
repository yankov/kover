# vertx run examples/server.rb -cluster -cluster-port 25501

require "../ruby/kover.rb"

require 'mongo_mapper'

MongoMapper.connection = Mongo::Connection.new('localhost', 27017)
MongoMapper.database = "kover-test"

require "examples/user.rb"
require "examples/post.rb"

Kover.run
