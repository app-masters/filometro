import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { Client, AddressType } from "@googlemaps/google-maps-services-js";
const client = new Client({});

admin.initializeApp();
const db = admin.firestore();

/**
 * Sanitize a zip, return it with only numbers, or null
 */
function sanitizeZip(zip: string): string {
  if (!zip) return "";
  const match = zip.match(/\d+/g);
  if (!match) return "";
  const zipCode = match.join("");
  if (zipCode.length !== 8) return "";
  return zipCode;
}

async function returnCoordinates(zip: string) {
  // Checks database first
  const dbResult = await db
    .collection("zipCoordinate")
    .where("zip", "==", zip)
    .get();
  if (!dbResult.empty) return dbResult.docs[0].data();

  //If non-existent, check google API
  const googleApiKey = functions.config().googlemaps.key;

  if (!googleApiKey) {
    console.log("    👉  No GOOGLE_API_KEY, will not fetch coordinates");
    //return undefined;
    throw new Error("No GOOGLE_API_KEY credentials.");
  }

  const queryData = await client.geocode({
    params: {
      components: "postal_code:" + zip + "|country:BR",
      key: googleApiKey,
    },
  });

  if (queryData && queryData.statusText === "OK") {
    const geometry = queryData.data.results[0].geometry;

    const returnData = {
      zip: zip,
      latitude: geometry.location.lat,
      longitude: geometry.location.lng,
    };
    await db.collection("zipCoordinate").add({
      zip: zip,
      latitude: geometry.location.lat.toFixed(3),
      longitude: geometry.location.lng.toFixed(3),
    });

    return returnData;
  } else if (queryData.data) {
    // Show some log if we don't know how to handle this result
    if (!["ZERO_RESULTS"].includes(queryData.statusText)) {
      console.log("  ‼️ unexpected result from Google Maps", queryData);
    }
  }
  //return undefined;
  throw new Error("No results found.");
}

async function returnZip(latitude: number, longitude: number) {
  // Checks database first
  const dbResult = await db
    .collection("zipCoordinate")
    .where("latitude", "==", latitude)
    .where("longitude", "==", longitude)
    .get();
  if (!dbResult.empty) return dbResult.docs[0].data();

  //If non-existent, check google API
  const googleApiKey = functions.config().googlemaps.key;
  if (!googleApiKey) {
    console.log("    👉  No GOOGLE_API_KEY, will not fetch coordinates");
    //return undefined;
    throw new Error("No GOOGLE_API_KEY credentials.");
  }

  const queryData = await client.reverseGeocode({
    params: {
      latlng: [latitude, longitude],
      key: googleApiKey,
    },
  });

  if (queryData && queryData.statusText === "OK") {
    const zip = queryData.data.results[0].address_components.filter((ac) =>
      ac.types.includes(AddressType.postal_code)
    );
    const sanitizedZip = sanitizeZip(zip[0].long_name);

    const returnData = {
      zip: sanitizedZip,
    };

    await db.collection("zipCoordinate").add({
      zip: sanitizedZip,
      latitude: Number(latitude).toFixed(3),
      longitude: Number(longitude).toFixed(3),
    });

    return returnData;
  } else if (queryData.data) {
    // Show some log if we don't know how to handle this result
    if (!["ZERO_RESULTS"].includes(queryData.statusText)) {
      console.log("  ‼️ unexpected result from Google Maps", queryData);
    }
  }
  //return undefined;
  throw new Error("No results found.");
}

export const createQueueUpdate = functions.firestore
  .document(
    "prefecture/{prefectureId}/place/{placeId}/queueUpdate/{queueUpdateId}"
  )
  .onCreate((snap, context) => {
    console.log(
      `Prefecture: ${context.params.prefectureId}, Place: ${context.params.placeId}, QueueUpdate: ${context.params.queueUpdateId}`
    );
    const queueRef = snap.ref;
    const newValue = snap.data();

    const placeRef = queueRef.parent.parent;
    return placeRef?.update({
      queueStatus: newValue.queueStatus,
      open: newValue.open,
      queueUpdatedAt: new Date(),
    });
  });

export const totalizeOpenPlacesCount = functions.firestore
  .document("prefecture/{prefectureId}/place/{placeId}")
  .onWrite((change, context) => {
    console.log(
      `Prefecture: ${context.params.prefectureId}, Place: ${context.params.placeId}`
    );

    const afterValue = change.after.data();
    const beforeValue = change.before.data();
    //If was created OR zip changed
    if (
      (!change.before.exists && change.after.exists) ||
      (afterValue &&
        beforeValue &&
        afterValue.addressZip !== beforeValue.addressZip)
    ) {
      returnCoordinates(afterValue?.addressZip)
        .then((data) => {
          if (data) {
            db.collection("prefecture")
              .doc(context.params.prefectureId)
              .collection("place")
              .doc(context.params.placeId)
              .update({
                latitude: data.latitude,
                longitude: data.longitude,
                addressZip: data.zip,
              });
          }
        })
        .catch((err) => {
          console.log("Error setting coordinates ", err);
        });
    }

    if (
      (change.after.exists && !change.before.exists) ||
      (!change.after.exists && change.before.exists) ||
      beforeValue?.active !== afterValue?.active ||
      beforeValue?.open !== afterValue?.open
    ) {
      //if it was created or deleted or open/active changed
      let numActive = 0;
      let numOpen = 0;

      const placeRef = change.after.ref;
      const prefectureRef = placeRef.parent.parent;

      return db
        .collection("prefecture")
        .doc(context.params.prefectureId)
        .collection("place")
        .where("active", "==", true)
        .get()
        .then((querySnapshot) => {
          numActive = querySnapshot.size;
          numOpen = querySnapshot.docs.filter((snap) => snap.data().open)
            .length;
          console.log(numActive, numOpen);
          return prefectureRef?.update({
            numPlaces: numActive,
            numPlacesOpen: numOpen,
          });
        });
    } else {
      return null;
    }
  });

export const getCoordinates = functions.https.onRequest(async (req, res) => {
  try {
    console.log(req.body);
    const { addressZip } = req.body;
    const zip = sanitizeZip(addressZip);
    const coordinates = await returnCoordinates(zip);
    res.json(coordinates);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

export const getZip = functions.https.onRequest(async (req, res) => {
  try {
    console.log(req.body);
    const { latitude, longitude } = req.body;
    const zip = await returnZip(latitude, longitude);

    res.json(zip);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});
