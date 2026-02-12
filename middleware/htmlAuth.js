const protectHTMLRoutes = (req, res, next) => {
    const publicPaths = ['/', '/index.html'];
    const isStaticAsset = req.path.startsWith('/js/') || req.path.startsWith('/css/') || req.path.startsWith('/socket.io/') || req.path.startsWith('/api/');
    if (publicPaths.includes(req.path) || isStaticAsset) {
        return next();
    }
    next();
};
module.exports = protectHTMLRoutes;
