import React from 'react';
import Avatar from 'react-avatar'; // We need to install this

const Client = ({ username }) => {
    return (
        <div className="flex items-center gap-3">
            <Avatar name={username} size={50} round="14px" />
            <span className="text-sm font-bold text-gray-300">{username}</span>
        </div>
    );
};

export default Client;