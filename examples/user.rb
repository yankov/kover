class User
 include Kover::RPCable

 allow_rpc_for :met1, :met2

 class << self
   def create(user)
     user
   end

   def met1(a, b)
     a + b
   end
 
    def met2(a,b)
      a * b
    end
  end
end
