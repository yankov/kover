class Post
  include Kover::RPCable

  allow_rpc_for :create, :edit

  def create(name)
    "created #{name}"
  end

  def edit(name)
    "edited #{name}"
  end

end
