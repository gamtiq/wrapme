var packageData = require("./package.json");

module.exports = {
    "projectName": {
        "link": true,
        "before": "&lparlt; ",
        "after": " &rpargt;"
    },
    "links": [
        {
            "text": "GitHub repo",
            "href": packageData.homepage,
            "style": "margin-left: 3rem;"
        }
    ],
    "createFile": ".nojekyll"
};
