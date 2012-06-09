class Post
  include MongoMapper::Document
  include Kover::RPCable

  key :title, String
  key :body,  String

  allow_rpc_for :find_all, :create, :edit, :get, :destroy

  class << self

    def create(params)
      post = Post.new(params)
      post.save!
      post.as_json
    end

    def find_all
      posts = Post.all
      p posts
      posts.as_json
    end

    def get(id)
      post = Post.find(id)
      post.as_json
    end

    def destroy(id)
      post = Post.find(id)
      post.destroy
      {:id => id}
    end

  end

end
