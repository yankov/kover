class User
 include MongoMapper::Document
 include Kover::RPCable

 allow_rpc_for :create, :find_by_name, :met1, :met2

 key :first_name, String
 key :last_name,  String

 class << self
   def create(user)
    u = self.new(user)
    u.save!
    u.as_json
   end

   def find_by_name(user)
     p "!!!"
     p user
     u = User.where(:first_name => user['first_name']).first
     u.try(:as_json)
   end

   def met1(a, b)
     a + b
   end
 
    def met2(a,b)
      a * b
    end
  end # class << self

  def as_json
    {
      :first_name => self.first_name,
      :last_name  => self.last_name
    }
  end

end 
