require 'mongo_mapper'

MongoMapper.connection = Mongo::Connection.new('localhost', 27017)
MongoMapper.database = "kover-test"
