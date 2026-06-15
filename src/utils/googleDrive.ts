/**
 * Google Drive Client-Side Backup & Restore Manager
 * Secure, zero-dependency helper to backup and restore TDEE JSON data.
 */

export interface GDriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
}

export function startGoogleAuth(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const scope = 'https://www.googleapis.com/auth/drive.file';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=select_account`;

    const width = 550;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'google-drive-auth',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      reject(new Error('COULD_NOT_OPEN_POPUP'));
      return;
    }

    const checkInterval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkInterval);
          reject(new Error('USER_CLOSED_POPUP'));
          return;
        }

        let href = '';
        try {
          href = popup.location.href;
        } catch (e) {
          // Cross-origin access raises an error until redirected back to our origin
          return;
        }

        if (href.startsWith(redirectUri)) {
          const hashHash = popup.location.hash;
          if (hashHash) {
            const params = new URLSearchParams(hashHash.substring(1));
            const accessToken = params.get('access_token');
            const error = params.get('error');

            clearInterval(checkInterval);
            popup.close();

            if (accessToken) {
              resolve(accessToken);
            } else if (error) {
              reject(new Error(`OAUTH_ERROR: ${error}`));
            } else {
              reject(new Error('NO_TOKEN_FOUND'));
            }
          }
        }
      } catch (err) {
        // Safe cross-origin access catch
      }
    }, 250);
  });
}

/**
 * Lists the backups existing in the app-specific area
 */
export async function findBackupFile(token: string, name: string = 'idfc_tdee_backup.json'): Promise<GDriveFileInfo | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(name)}' and trashed=false&fields=files(id,name,modifiedTime)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`FILE_LIST_FAILED: ${response.status}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0] as GDriveFileInfo;
    }
    return null;
  } catch (err) {
    console.error('findBackupFile error:', err);
    throw err;
  }
}

/**
 * Saves or Overrides Backup File on Google Drive
 */
export async function saveBackupFile(token: string, backupData: any, existingFileId?: string): Promise<string> {
  const name = 'idfc_tdee_backup.json';
  const metadata = {
    name,
    mimeType: 'application/json',
  };
  const content = JSON.stringify(backupData, null, 2);

  try {
    if (existingFileId) {
      // Overwrite existing file content (PATCH)
      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: content,
        }
      );

      if (!res.ok) {
        throw new Error(`OVERWRITE_PATCH_FAILED: ${res.status}`);
      }

      return existingFileId;
    } else {
      // Create new file (Multipart POST)
      const boundary = 'idfc_backup_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const requestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelim;

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: requestBody,
        }
      );

      if (!res.ok) {
        throw new Error(`CREATE_POST_FAILED: ${res.status}`);
      }

      const resData = await res.json();
      return resData.id;
    }
  } catch (err) {
    console.error('saveBackupFile error:', err);
    throw err;
  }
}

/**
 * Reads specified file from Google Drive
 */
export async function downloadBackupFile(token: string, fileId: string): Promise<any> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`DOWNLOAD_FAILED: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('downloadBackupFile error:', err);
    throw err;
  }
}
