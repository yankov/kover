module Kover

  class << self
    def rpc_white_list_for(class_list)
      class_list.inject({}) do |list, class_name|
        klass = Object.const_get(class_name.capitalize)

        list[class_name] = klass.send(:rpc_white_list)
        list
      end
    end

    def proccess(rpc_string)
      class_name, method = rpc_string['method'].split(".")
      klass = Object.const_get(class_name.capitalize)

      begin 
        result = klass.send(method, *rpc_string['params'].compact)
        json_rpc_format(result, nil, rpc_string['id'])
      rescue => e
        json_rpc_format(nil, e.message, rpc_string['id'])
      end
    end

    def json_rpc_format(result, error, id)
      { "result" => result, "error" => error, "id" => id }
    end

    def run
      id = Vertx::EventBus.register_handler('some-address') do |message|
       result = Kover.proccess(message.body)
       message.reply(result)
      end
    end

  end 

end
