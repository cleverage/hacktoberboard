
const fetch = require('node-fetch');
var { graphql, buildSchema } = require('graphql');
const moment = require('moment');

const start = escape(moment().month(9).startOf('month').startOf('day').format('YYYY-MM-DD'));
const end = escape(moment().month(9).endOf('month').endOf('day').format('YYYY-MM-DD'));

function btoa(str) {
  let buffer;

  if (str instanceof Buffer) {
    buffer = str;
  } else {
    buffer = Buffer.from(str.toString(), 'binary');
  }

  return buffer.toString('base64');
}

function getQuery(login) {
  return `
    query {
      search(query: "author:${login} -label:invalid is:pr is:public created:${start}..${end}", type: ISSUE, last: 4) {
        issueCount
      }
    }
  `
}

module.exports = async ({
  username,
  token,
  org,
  team,
  verbose,
}) => {
  const auth = `Basic ${btoa(`${username}:${token}`)}`;

  const query = (team) ? `
    query {
      organization(login:"${org}") {
        team(slug:"${team}") {
          members(first: 100) {
            edges {
              node {
                login
                name
                avatarUrl
              }
            }
          }
        }
      }
    }
  ` : `
    query {
      organization(login:"${org}") {
        membersWithRole(first: 100) {
          edges {
            node {
              login
              name
              avatarUrl
            }
          }
        }
      }
    }
  `;

  if (verbose) { console.info('Fetch org members'); }
  const response = await fetch(`https://api.github.com/graphql`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query
    }),
  });


  if (false === response.ok) {
    return;
  }

  const jsonResponse = await response.json();

  const membersInfo = team ? jsonResponse.data.organization.team.members.edges : jsonResponse.data.organization.membersWithRole.edges;

  const membersStats = membersInfo.map(async ({node}) => {
    if (verbose) { console.info(`Fetch "${node.login}" pull request counter.`); }
    try {
      const responcePR = await fetch(`https://api.github.com/graphql`, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: getQuery(node.login),
        }),
      });

      if (false === responcePR.ok) {
        console.log(`response KO for "${node.login}"`, responcePR);
        node.prCount = null;
        return node;
      }

      const { data : { search : {issueCount} } } = await responcePR.json();

      node.prCount = issueCount;
      return node;

    } catch (err) {
      console.error(err.message)
    }

    node.prCount = null;

    return node;
  });

  const result = await Promise.all(membersStats);

  return result.sort((a, b) => {
    if (a.prCount === b.prCount) { return 0; }
    if (a.prCount > b.prCount || b.prCount === null) { return -1; }
    return 1;
  })
};
