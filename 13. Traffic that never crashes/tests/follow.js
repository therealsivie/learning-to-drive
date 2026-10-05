const { pageFiles, createSandbox, place, createReport } = require("./sandbox.js");

const sandbox = createSandbox(pageFiles());
const traffic = sandbox.run("new Traffic(world, 2)");
const polysIntersect = sandbox.run("polysIntersect");
const { carSize, idm } = sandbox.run("({ carSize, idm })");
const lane = traffic.network.paths
   .filter((p) => p.kind == "lane")
   .reduce((a, b) => (b.length > a.length ? b : a));
const [leader, follower] = traffic.drivers;
const report = createReport();

place(follower, [lane], 60);
let overlapped = false;
for (let i = 0; i < 600; i++) {
   place(leader, [lane], 200);
   traffic.update();
   if (polysIntersect(leader.car.polygon, follower.car.polygon)) {
      overlapped = true;
   }
}
const gap = leader.s - carSize.length / 2 - (follower.s + carSize.length / 2);

report.check("the follower drove up to the stopped leader", follower.s > 100);
report.check("the follower never touched the leader", !overlapped);
report.check("the follower stopped at least s0 - 2 behind", gap >= idm.s0 - 2);
report.check("the follower came to a stop", follower.speed < 0.01);
report.check("no errors", traffic.errors.length == 0);

report.finish();
