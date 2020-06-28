var packageData = require("./package.json");

module.exports = {
    "projectName": {
        "link": true,
        "before": '<span class="title">&lparlt; </span>',
        "after": '<span class="title"> &rpargt;</span>'
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
