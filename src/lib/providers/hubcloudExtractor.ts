import axios from 'axios';
import * as cheerio from 'cheerio';
import {Stream} from './types';
import {headers} from './headers';

const decode = function (value: string) {
  if (value === undefined) {
    return '';
  }
  return atob(value.toString());
};

export async function hubcloudExtracter(link: string, signal: AbortSignal) {
  try {
    console.log('hubcloudExtracter', link);
    const baseUrl = link.split('/').slice(0, 3).join('/');
    const streamLinks: Stream[] = [];
    const vLinkRes = await axios(`${link}`, {headers, signal});
    const vLinkText = vLinkRes.data;
    const $vLink = cheerio.load(vLinkText);
    const vLinkRedirect = vLinkText.match(/var\s+url\s*=\s*'([^']+)';/) || [];
    let vcloudLink =
      decode(vLinkRedirect[1]?.split('r=')?.[1]) ||
      vLinkRedirect[1] ||
      $vLink('.fa-file-download.fa-lg').parent().attr('href') ||
      link;
    console.log('vcloudLink', vcloudLink);
    if (vcloudLink?.startsWith('/')) {
      vcloudLink = `${baseUrl}${vcloudLink}`;
      console.log('New vcloudLink', vcloudLink);
    }
    const vcloudRes = await fetch(vcloudLink, {
      headers,
      signal,
      redirect: 'follow',
    });
    const $ = cheerio.load(await vcloudRes.text());
    // console.log('vcloudRes', $.text());

    const linkClass = $('.btn-success.btn-lg.h6,.btn-danger,.btn-secondary');
    for (const element of linkClass) {
      const itm = $(element);
      let linkHref = itm.attr('href') || '';

      switch (true) {
        case linkHref?.includes('pixeld'):
          if (!linkHref?.includes('api')) {
            const token = linkHref.split('/').pop();
            const pixelBaseUrl = linkHref.split('/').slice(0, -2).join('/');
            linkHref = `${pixelBaseUrl}/api/file/${token}?download`;
          }
          streamLinks.push({
            server: 'Pixeldrain',
            link: linkHref,
            type: 'mkv',
          });
          break;

        case linkHref?.includes('.dev') && !linkHref?.includes('/?id='):
          streamLinks.push({
            server: 'Cf Worker',
            link: linkHref,
            type: 'mkv',
          });
          break;

        case linkHref?.includes('hubcloud') || linkHref?.includes('/?id='):
          try {
            const newLinkRes = await fetch(linkHref, {
              method: 'HEAD',
              headers,
              signal,
              redirect: 'manual',
            });

            // Check if response is a redirect (301, 302, etc.)
            let newLink = linkHref;
            if (newLinkRes.status >= 300 && newLinkRes.status < 400) {
              newLink = newLinkRes.headers.get('location') || linkHref;
            } else if (newLinkRes.url && newLinkRes.url !== linkHref) {
              // Fallback: check if URL changed (redirect was followed)
              newLink = newLinkRes.url;
            } else {
              newLink = newLinkRes.headers.get('location') || linkHref;
            }
            if (newLink.includes('googleusercontent')) {
              newLink = newLink.split('?link=')[1];
            } else {
              const newLinkRes2 = await fetch(newLink, {
                method: 'HEAD',
                headers,
                signal,
                redirect: 'manual',
              });

              // Check if response is a redirect
              if (newLinkRes2.status >= 300 && newLinkRes2.status < 400) {
                newLink =
                  newLinkRes2.headers.get('location')?.split('?link=')[1] ||
                  newLink;
              } else if (newLinkRes2.url && newLinkRes2.url !== newLink) {
                // Fallback: URL changed due to redirect
                newLink = newLinkRes2.url.split('?link=')[1] || newLinkRes2.url;
              } else {
                newLink =
                  newLinkRes2.headers.get('location')?.split('?link=')[1] ||
                  newLink;
              }
            }

            streamLinks.push({
              server: 'hubcloud',
              link: newLink,
              type: 'mkv',
            });
          } catch (error) {
            console.log('hubcloudExtracter error in hubcloud link: ', error);
          }
          break;

        case linkHref?.includes('cloudflarestorage'):
          streamLinks.push({
            server: 'CfStorage',
            link: linkHref,
            type: 'mkv',
          });
          break;

        case linkHref?.includes('fastdl') || linkHref?.includes('fsl.'):
          streamLinks.push({server: 'FastDl', link: linkHref, type: 'mkv'});
          break;

        case linkHref.includes('hubcdn') && !linkHref.includes('/?id='):
          streamLinks.push({
            server: 'HubCdn',
            link: linkHref,
            type: 'mkv',
          });
          break;

        default:
          if (linkHref?.includes('.mkv') || linkHref?.includes('?token=')) {
            const serverName =
              linkHref
                .match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)/i)?.[1]
                ?.replace(/\./g, ' ') || 'Unknown';
            streamLinks.push({
              server: serverName,
              link: linkHref,
              type: 'mkv',
            });
          }
          break;
      }
    }

    console.log('streamLinks', streamLinks);
    return streamLinks;
  } catch (error) {
    console.log('hubcloudExtracter error: ', error);
    return [];
  }
}
