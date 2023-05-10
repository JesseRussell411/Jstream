module.exports = {
    devServer: {
        proxy: {
            "/test": {
                target: "http://localhost:3001",
                secure: false,
            },
        },
    },
};
