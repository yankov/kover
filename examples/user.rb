class User
 include Kover::RPCable

 allow_rpc_for :create, :pop, :met1, :met2

 class << self
   def create(user)
    Redis.new.lpush('users', user.to_json)
   end

   def pop
    Redis.new.lpop('users')
   end

   def met1(a, b)
     a + b
   end
 
    def met2(a,b)
      a * b
    end
  end
end
