# SSL/TLS

Applies to every style — `ssl::stream<>` is a library feature, not a language one.


```cpp
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>

namespace asio = boost::asio;
namespace ssl = asio::ssl;
using tcp = asio::ip::tcp;

asio::awaitable<void> tls_client(asio::io_context& io) {
    ssl::context ctx(ssl::context::tlsv13_client);
    ctx.set_default_verify_paths();

    ssl::stream<tcp::socket> stream(io, ctx);

    // Connect underlying TCP socket
    auto& sock = stream.lowest_layer();
    co_await sock.async_connect(endpoint);

    // Set SNI hostname (required for most servers)
    SSL_set_tlsext_host_name(stream.native_handle(), "example.com");
    stream.set_verify_mode(ssl::verify_peer);
    stream.set_verify_callback(ssl::host_name_verification("example.com"));

    // TLS handshake
    co_await stream.async_handshake(ssl::stream_base::client);

    // Read/write as normal stream
    co_await async_write(stream, asio::buffer(request));
    co_await async_read_until(stream, response_buf, "\r\n");
}
```

**Critical:** SSL streams require strand-based synchronization for all async operations — no concurrent reads/writes without a strand.
