sub init()
    m.top.functionName = "loadHome"
end sub

sub loadHome()
    transfer = CreateObject("roUrlTransfer")
    transfer.SetUrl(m.top.endpoint)
    transfer.AddHeader("Accept", "application/json")
    body = transfer.GetToString()

    if transfer.GetResponseCode() <> 200
        m.top.error = "Catalog request returned HTTP " + transfer.GetResponseCode().ToStr()
        return
    end if

    feed = ParseJson(body)
    if feed = invalid or feed.rows = invalid
        m.top.error = "Catalog response did not contain a Roku row collection."
        return
    end if

    root = CreateObject("roSGNode", "ContentNode")
    for each rowData in feed.rows
        row = root.CreateChild("ContentNode")
        row.title = safeString(rowData.title, "Living Nexus")

        if rowData.items <> invalid
            for each itemData in rowData.items
                item = row.CreateChild("ContentNode")
                item.title = safeString(itemData.title, "Untitled manifestation")
                item.description = safeString(itemData.shortDescription, "Living Nexus")
                item.HDPosterUrl = safeString(itemData.hdPosterUrl, "")
                item.SDPosterUrl = safeString(itemData.sdPosterUrl, "")
                item.url = safeString(itemData.streamUrl, "")
                item.streamFormat = safeString(itemData.streamFormat, "mp3")
                item.AddFields({
                    contentId: safeString(itemData.contentId, ""),
                    creatorName: safeNestedString(itemData, "creator", "name", "Unknown creator"),
                    creatorHandle: safeNestedString(itemData, "creator", "handle", ""),
                    witnessId: safeNestedString(itemData, "provenance", "witnessId", ""),
                    verificationStatus: safeNestedString(itemData, "provenance", "verificationStatus", "unverified"),
                    registeredAt: safeNestedString(itemData, "provenance", "registeredAt", ""),
                    verificationUrl: safeNestedString(itemData, "provenance", "webVerifyUrl", ""),
                    originStory: safeNestedString(itemData, "provenance", "originStory", ""),
                    genre: safeNestedString(itemData, "metadata", "genre", "")
                })
            end for
        end if
    end for

    m.top.content = root
end sub

function safeString(value as Dynamic, fallback as String) as String
    if value = invalid or value = "" then return fallback
    return value.ToStr()
end function

function safeNestedString(value as Object, containerName as String, fieldName as String, fallback as String) as String
    if value = invalid or value[containerName] = invalid or value[containerName][fieldName] = invalid then return fallback
    return safeString(value[containerName][fieldName], fallback)
end function
