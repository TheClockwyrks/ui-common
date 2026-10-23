// `@clockwyrks/ui/embed` — the embedded static-build player, on its own.
//
// A narrow entry beside `./app` rather than a member of it. `./app` is the whole
// routed gallery application: importing it imports the gallery's global stylesheet
// and every page behind it, which is the right trade for a host that mounts the
// gallery and the wrong one for a tool that wants the iframe. The Spec Cabinet is
// the second kind of consumer — it embeds a demonstration's built bundle and a
// reference implementation's build the same way a run's playable build is embedded
// here, and it has a design of its own — so the component it needs is exported
// without the application around it.
export {
  PlayableEmbed,
  type PlayableEmbedMode,
} from "./components/PlayableEmbed";
