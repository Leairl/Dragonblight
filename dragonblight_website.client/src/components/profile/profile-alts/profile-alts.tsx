import { FC, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Card, Skeleton } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import { ClassColor } from "../../../helpers/classColorHelper";
import { realmDisplayName } from "../../../helpers/realmNameHelper";
import { retailTier } from "../../../helpers/ratingTierHelper";
import "./profile-alts.css";


const ProfileAlts: FC = (/*props*/) => {
  const [alts, setAlts] = useState<Dragonblight.GetAltsResponse[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const { region, server, characterName } = useParams();

  //same pattern as the other profile panes: refetch whenever the looked up character changes
  useEffect(() => {
    if (region == null || server == null || characterName == null) {
      return;
    }
    setLoading(true);
    const AltClient = new Dragonblight.AltClient();
    const slug = server?.replace(" ", "-");
    AltClient.getAlts(slug, characterName, region)
      .then((data) => {
        setAlts(data);
        setLoading(false);
      })
      .catch(() => {
        setAlts([]);
        setLoading(false);
      });
  }, [region, server, characterName]);

  return (
    <div className="alt-pane">
      <p className="alt-intro">
        Other characters on this Battle.net account.
      </p>
      {loading && getSkeletons()}
      {!loading && alts?.length === 0 && (
        <p className="alt-empty">
          No known alts among the characters we have indexed.
        </p>
      )}
      {!loading && (
        <div className="alt-cards">{alts?.map(getAltCard)}</div>
      )}
    </div>
  );

  function getRating(bracket: string, rating: number | undefined) {
    if (!rating) {
      return null;
    }
    return (
      <span className="alt-rating" key={bracket}>
        {/* the rating carries its tier's color, the same one the rating cards use */}
        <span className="alt-bracket">{bracket}</span>{" "}
        <span className={retailTier(rating)?.text ?? "text-stone-100"}>
          {rating}
        </span>
      </span>
    );
  }

  function getAltCard(alt: Dragonblight.GetAltsResponse, index: number) {
    return (
      <Card className="alt-card" key={"Alt" + index}>
        <Link to={`/profile/${region}/${alt.realm}/${alt.name}`}>
          <div className="alt-head">
            <img
              src={`/ClassIcons/${alt.classchar}.png`}
              height="25px"
              width="25px"
              style={{ maxHeight: "25px", maxWidth: "25px" }}
              alt={alt.classchar ?? ""}
            ></img>
            <span
              className="alt-name"
              style={{ color: ClassColor.get(alt.classchar ?? "") }}
            >
              {alt.name}
            </span>
            <span className="alt-realm">{realmDisplayName(alt.realm)}</span>
          </div>
        </Link>
        <div className="alt-detail">
          <span className="alt-spec">{alt.spec}</span>
          {/* an unplayed bracket comes back as 0 and is left off the card */}
          {getRating("2v2", alt.rating2v2)}
          {getRating("3v3", alt.rating3v3)}
          {getRating("RBG", alt.ratingRbg)}
        </div>
      </Card>
    );
  }

  function getSkeletons() {
    const skeletons = [];
    for (let i = 0; i < 3; i++) {
      skeletons.push(
        <Skeleton key={"AltSkeleton" + i} className="alt-card h-20">
          <Card></Card>
        </Skeleton>
      );
    }
    return <div className="alt-cards">{skeletons}</div>;
  }
};

export default ProfileAlts;
